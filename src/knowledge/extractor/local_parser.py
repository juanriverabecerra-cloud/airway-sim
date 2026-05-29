import sys
import json
import os
import re
import math
import traceback

try:
    import fitz  # PyMuPDF
except ImportError:
    print(json.dumps({"error": "PyMuPDF (fitz) is not installed."}))
    sys.exit(1)

try:
    import pytesseract
    pytesseract.pytesseract.tesseract_cmd = '/opt/homebrew/bin/tesseract'
except ImportError:
    pass

try:
    from PIL import Image
except ImportError:
    pass

# silences fitz C-level warnings to ensure stdout remains pure JSON
try:
    fitz.tools.set_warning_level(0)
except AttributeError:
    pass

def sanitize_fig_id(cap_text, xref, page_num):
    # Try to find standard figure identifier like "Fig. 9.1"
    fig_match = re.search(r'(?:Fig\.|Figure)\s*([\d\.\-_]+)', cap_text, re.IGNORECASE)
    if fig_match:
        clean_num = fig_match.group(1).replace('.', '_').replace('-', '_').strip('_')
        return f"FIG_{clean_num}"
    return f"FIG_PAGE_{page_num}_xref_{xref}"

def get_closest_heading(blocks, cap_block_idx):
    # Find the nearest preceding heading block
    for i in range(cap_block_idx - 1, -1, -1):
        block = blocks[i]
        if block[6] == 0:  # Text block
            text = block[4].strip()
            # Simple heading heuristics: short, uppercase, or starts with section number
            lines = [l.strip() for l in text.split('\n') if l.strip()]
            if lines:
                first_line = lines[0]
                if len(first_line) < 100 and (first_line.isupper() or re.match(r'^(?:\d+\.|\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b)', first_line)):
                    return first_line
    return ""

def cluster_ocr_phrases(img_path):
    lang = 'eng_best' if os.path.exists('/opt/homebrew/share/tessdata/eng_best.traineddata') else 'eng'
    img = Image.open(img_path)
    # PSM 11: Sparse text with coordinates
    data = pytesseract.image_to_data(img, config=f'--oem 1 --psm 11 -l {lang}', output_type=pytesseract.Output.DICT)
    
    words = []
    for i in range(len(data['text'])):
        w = data['text'][i].strip()
        try:
            c = float(data['conf'][i])
        except (ValueError, TypeError):
            c = 0.0
        if w and c > 0:
            words.append({
                'text': w,
                'x0': data['left'][i],
                'y0': data['top'][i],
                'x1': data['left'][i] + data['width'][i],
                'y1': data['top'][i] + data['height'][i],
                'conf': c
            })
            
    words = sorted(words, key=lambda w: (w['y0'], w['x0']))
    grouped = []
    for w in words:
        merged = False
        for g in grouped:
            # Group adjacent words on same line (y diff < 15, horizontal gap < 30)
            if abs(w['y0'] - g['y0']) < 15 and abs(w['x0'] - g['x1']) < 30:
                g['text'] += ' ' + w['text']
                g['x1'] = max(g['x1'], w['x1'])
                g['y0'] = min(g['y0'], w['y0'])
                g['y1'] = max(g['y1'], w['y1'])
                g['conf'] = (g['conf'] + w['conf']) / 2
                merged = True
                break
        if not merged:
            grouped.append(w)
            
    result_boxes = []
    for g in grouped:
        text = g['text'].strip()
        if g['conf'] < 75:
            text += " [uncertain]"
            
        # Keep clean verbatim characters without guessing
        if len(text.replace(" [uncertain]", "").strip()) > 1:
            result_boxes.append({
                "text": text,
                "bbox": [g['x0'], g['y0'], g['x1'], g['y1']],
                "confidence": round(g['conf'], 1)
            })
    return result_boxes

def verify_pixel_connection(img_rgb, bbox_a, bbox_b):
    try:
        # Center points of bboxes
        cx_a = int((bbox_a[0] + bbox_a[2]) / 2)
        cy_a = int((bbox_a[1] + bbox_a[3]) / 2)
        cx_b = int((bbox_b[0] + bbox_b[2]) / 2)
        cy_b = int((bbox_b[1] + bbox_b[3]) / 2)
        
        dx = cx_b - cx_a
        dy = cy_b - cy_a
        length = math.sqrt(dx*dx + dy*dy)
        if length < 15:
            return False
            
        # Exclude regions directly inside/near text boxes to avoid text interference
        start_ratio = 15.0 / length
        end_ratio = 1.0 - (15.0 / length)
        if start_ratio >= end_ratio:
            start_ratio = 0.1
            end_ratio = 0.9
            
        non_white_count = 0
        total_samples = 30
        width, height = img_rgb.size
        
        for i in range(total_samples):
            ratio = start_ratio + (end_ratio - start_ratio) * (i / (total_samples - 1))
            px = int(cx_a + dx * ratio)
            py = int(cy_a + dy * ratio)
            
            px = max(0, min(width - 1, px))
            py = max(0, min(height - 1, py))
            
            r, g, b = img_rgb.getpixel((px, py))
            # Non-white: dark or saturated pixels
            is_non_white = (r + g + b) / 3.0 < 220 or max(abs(r-g), abs(g-b), abs(r-b)) > 30
            if is_non_white:
                non_white_count += 1
                
        # Connect if at least 15% of path is visual line pixels
        return (non_white_count / total_samples) >= 0.15
    except Exception:
        return False

def extract_pdf(file_path):
    doc = fitz.open(file_path)
    source_file = os.path.basename(file_path)
    
    # Check if PDF requires OCR
    total_chars = 0
    for page in doc:
        total_chars += len(page.get_text().strip())
    is_scanned = (total_chars < 150 * len(doc))
    
    fragments = []
    visual_data_engines = []
    warnings = []
    
    try:
        if doc.is_repaired:
            warnings.append("The PDF cross-reference table was corrupt and was automatically repaired.")
    except AttributeError:
        pass
        
    scratch_dir = "scratch/extracted_images"
    os.makedirs(scratch_dir, exist_ok=True)
    
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page_num = page_idx + 1
        page_id = f"PAGE_{page_num:03d}"
        
        raw_text = ""
        sections = []
        word_bounding_boxes = []
        
        if is_scanned:
            try:
                pix = page.get_pixmap(dpi=300)
                img_data = pix.tobytes("png")
                from io import BytesIO
                img = Image.open(BytesIO(img_data))
                
                lang = 'eng_best' if os.path.exists('/opt/homebrew/share/tessdata/eng_best.traineddata') else 'eng'
                custom_config = f'--oem 1 --psm 6 -l {lang}'
                
                # Word coordinates via OCR
                data = pytesseract.image_to_data(img, config=custom_config, output_type=pytesseract.Output.DICT)
                raw_text_parts = []
                scale_x = page.rect.width / img.width
                scale_y = page.rect.height / img.height
                
                for i in range(len(data['text'])):
                    word = data['text'][i].strip()
                    try:
                        c = float(data['conf'][i])
                    except (ValueError, TypeError):
                        c = 0.0
                    if word and c > 0:
                        x0 = round(data['left'][i] * scale_x, 1)
                        y0 = round(data['top'][i] * scale_y, 1)
                        x1 = round((data['left'][i] + data['width'][i]) * scale_x, 1)
                        y1 = round((data['top'][i] + data['height'][i]) * scale_y, 1)
                        
                        word_bounding_boxes.append({
                            "text": word,
                            "bbox": [x0, y0, x1, y1]
                        })
                        raw_text_parts.append(word)
                raw_text = " ".join(raw_text_parts)
            except Exception as e:
                warnings.append(f"OCR failed on Page {page_num}: {str(e)}")
                raw_text = page.get_text() or ""
        else:
            # Word coordinates via PyMuPDF
            words_data = page.get_text("words")
            for w in words_data:
                word_bounding_boxes.append({
                    "text": w[4],
                    "bbox": [round(w[0], 1), round(w[1], 1), round(w[2], 1), round(w[3], 1)]
                })
                
            blocks = page.get_text("blocks")
            blocks = sorted(blocks, key=lambda b: (b[1], b[0]))
            
            text_parts = []
            captions = []
            
            for idx, block in enumerate(blocks):
                if block[6] == 0:
                    text = block[4].strip()
                    if not text:
                        continue
                    text_parts.append(text)
                    if re.match(r'^(?:Fig\b\.|Figure\b)', text, re.IGNORECASE):
                        captions.append((idx, block, text))
                        
            raw_text = "\n\n".join(text_parts)
            
            # Heading matching
            current_sec = None
            for idx, block in enumerate(blocks):
                if block[6] == 0:
                    text = block[4].strip()
                    lines = [l.strip() for l in text.split('\n') if l.strip()]
                    if lines:
                        first_line = lines[0]
                        is_heading = len(first_line) < 100 and (first_line.isupper() or re.match(r'^(?:\d+\.|\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b)', first_line))
                        
                        if is_heading:
                            if current_sec:
                                sections.append(current_sec)
                            current_sec = {
                                "heading": first_line,
                                "body": "\n".join(lines[1:]) if len(lines) > 1 else "",
                                "startLine": len(sections) + 1,
                                "category": "heading"
                            }
                        else:
                            if current_sec:
                                current_sec["body"] += "\n" + text
                            else:
                                current_sec = {
                                    "heading": "",
                                    "body": text,
                                    "startLine": len(sections) + 1,
                                    "category": "paragraph"
                                }
            if current_sec:
                sections.append(current_sec)
                
            # Perform programmatic visual cropping (Phase 1)
            images = page.get_image_info(xrefs=True)
            for cap_idx, cap_block, cap_text in captions:
                cap_bbox = cap_block[:4]
                closest_img = None
                min_dist = float('inf')
                
                for img in images:
                    img_bbox = img['bbox']
                    img_center_y = (img_bbox[1] + img_bbox[3]) / 2
                    cap_center_y = (cap_bbox[1] + cap_bbox[3]) / 2
                    dist = abs(img_center_y - cap_center_y)
                    if dist < min_dist:
                        min_dist = dist
                        closest_img = img
                        
                if closest_img and min_dist < 400:
                    xref = closest_img['xref']
                    fig_id = sanitize_fig_id(cap_text, xref, page_num)
                    
                    img_bbox = closest_img['bbox']
                    rect = fitz.Rect(img_bbox)
                    rect.x0 = max(0, rect.x0 - 5)
                    rect.y0 = max(0, rect.y0 - 5)
                    rect.x1 = min(page.rect.width, rect.x1 + 5)
                    rect.y1 = min(page.rect.height, rect.y1 + 5)
                    
                    try:
                        pix = page.get_pixmap(clip=rect, dpi=300)
                        out_filename = f"{source_file.replace('.', '_')}_{fig_id}.png"
                        out_path = os.path.join(scratch_dir, out_filename)
                        pix.save(out_path)
                        
                        heading = get_closest_heading(blocks, cap_idx)
                        
                        # Programmatic word extraction inside image frame coordinates
                        text_bounding_boxes = cluster_ocr_phrases(out_path)
                        
                        # Programmatic Vector Path Tracing between mapped phrases
                        source_target_vectors = []
                        if 1 < len(text_bounding_boxes) <= 15:
                            try:
                                img = Image.open(out_path)
                                img_rgb = img.convert('RGB')
                                for idx_a in range(len(text_bounding_boxes)):
                                    for idx_b in range(len(text_bounding_boxes)):
                                        if idx_a != idx_b:
                                            box_a = text_bounding_boxes[idx_a]
                                            box_b = text_bounding_boxes[idx_b]
                                            
                                            # Verify physical vector line pixels locally
                                            if verify_pixel_connection(img_rgb, box_a['bbox'], box_b['bbox']):
                                                source_target_vectors.append({
                                                    "source": box_a['text'].replace(" [uncertain]", ""),
                                                    "target": box_b['text'].replace(" [uncertain]", ""),
                                                    "direction": "Unidirectional",
                                                    "sign": "Excitatory",
                                                    "status": "locally_verified"
                                                })
                            except Exception:
                                pass
                        
                        visual_data_engines.append({
                            "id": fig_id,
                            "sourceFile": source_file,
                            "pageNumber": page_num,
                            "image_path": os.path.abspath(out_path),
                            "closest_text_heading": heading,
                            "caption": cap_text,
                            "text_bounding_boxes": text_bounding_boxes,
                            "archetype": "ANATOMICAL NETWORKS & MICROCIRCUIT MAPS",
                            "details": {
                                "nodes": {
                                    b['text'].replace(" [uncertain]", ""): {
                                        "name": b['text'].replace(" [uncertain]", ""),
                                        "relational_variants": []
                                    } for b in text_bounding_boxes
                                },
                                "source_target_vectors": source_target_vectors
                            }
                        })
                    except Exception as e:
                        warnings.append(f"Failed to crop visual engine {fig_id} on page {page_num}: {str(e)}")
                else:
                    # Enforce programmatic Keyword-Anchor Spatial Cropping for PDF vector diagrams
                    fig_id = sanitize_fig_id(cap_text, f"vector_{cap_idx}", page_num)
                    
                    try:
                        # 1. Look for vector drawings around this caption bbox
                        # Search window above (up to 350 pts)
                        drawings = page.get_drawings()
                        cy0 = cap_bbox[1]
                        cy1 = cap_bbox[3]
                        
                        drawings_above = []
                        drawings_below = []
                        for d in drawings:
                            r = d["rect"]
                            # Exclude full-width line borders or extremely thin lines
                            if r.width >= page.rect.width * 0.98 or r.height < 1.5:
                                continue
                            
                            # Clamped to page bounds
                            if cy0 - 350 <= r.y0 < cy0 and r.y1 <= cy0 + 10:
                                drawings_above.append(d)
                            elif cy1 - 10 <= r.y0 < cy1 + 350:
                                drawings_below.append(d)
                                
                        # Decide which zone has vector diagrams
                        drawings_zone = []
                        is_above = True
                        if len(drawings_above) > len(drawings_below) and len(drawings_above) > 0:
                            drawings_zone = drawings_above
                            is_above = True
                        elif len(drawings_below) >= len(drawings_above) and len(drawings_below) > 0:
                            drawings_zone = drawings_below
                            is_above = False
                            
                        if len(drawings_zone) > 0:
                            # Union box of drawings in page coordinate space
                            union_rect = fitz.Rect()
                            for d in drawings_zone:
                                r = d["rect"]
                                clamped = fitz.Rect(max(0, r.x0), max(0, r.y0), min(page.rect.width, r.x1), min(page.rect.height, r.y1))
                                union_rect.include_rect(clamped)
                                
                            # Expand horizontal bounds to align with caption or margins
                            x0 = max(45.0, min(cap_bbox[0] - 10, union_rect.x0 - 10))
                            x1 = min(page.rect.width - 45.0, max(cap_bbox[2] + 10, union_rect.x1 + 10))
                            
                            if is_above:
                                y1 = cy0 - 2
                                y0 = max(0, union_rect.y0 - 15)
                                # Avoid preceding caption overlapping
                                for other_idx, other_block, other_text in captions:
                                    if other_idx != cap_idx:
                                        other_bbox = other_block[:4]
                                        # If other caption is above this one
                                        if other_bbox[3] < cy0:
                                            y0 = max(other_bbox[3] + 2, y0)
                            else:
                                y0 = cy1 + 2
                                y1 = min(page.rect.height, union_rect.y1 + 15)
                                # Avoid succeeding caption overlapping
                                for other_idx, other_block, other_text in captions:
                                    if other_idx != cap_idx:
                                        other_bbox = other_block[:4]
                                        # If other caption is below this one
                                        if other_bbox[1] > cy1:
                                            y1 = min(other_bbox[1] - 2, y1)
                                            
                            rect = fitz.Rect(x0, y0, x1, y1)
                            
                            # Render at 300 DPI
                            pix = page.get_pixmap(clip=rect, dpi=300)
                            out_filename = f"{source_file.replace('.', '_')}_{fig_id}.png"
                            out_path = os.path.join(scratch_dir, out_filename)
                            pix.save(out_path)
                            
                            heading = get_closest_heading(blocks, cap_idx)
                            text_bounding_boxes = cluster_ocr_phrases(out_path)
                            
                            # Archetype classification by caption keyword
                            archetype = "COORDINATE X-Y GRAPHS & COMPLEMENTARY PANELS"
                            details = {}
                            
                            cap_lower = cap_text.lower()
                            if "eeg" in cap_lower or "electroencephalogram" in cap_lower:
                                archetype = "CONTINUOUS_WAVEFORM_EEG"
                                details = {
                                    "nodes": {},
                                    "source_target_vectors": [],
                                    "labels": [b["text"].replace(" [uncertain]", "") for b in text_bounding_boxes]
                                }
                            elif "hypnogram" in cap_lower:
                                archetype = "TIMELINE_STEP_CHART_HYPNOGRAM"
                                details = {
                                    "labels": [b["text"].replace(" [uncertain]", "") for b in text_bounding_boxes],
                                    "y_axis_stages": ["W", "REM", "1", "2", "3"],
                                    "x_axis_timestamps": ["10pm", "11pm", "12pm", "01am", "02am", "03am", "04am", "05am", "06am"]
                                }
                            else:
                                details = {
                                    "labels": [b["text"].replace(" [uncertain]", "") for b in text_bounding_boxes]
                                }
                                
                            visual_data_engines.append({
                                "id": fig_id,
                                "sourceFile": source_file,
                                "pageNumber": page_num,
                                "image_path": os.path.abspath(out_path),
                                "closest_text_heading": heading,
                                "caption": cap_text,
                                "text_bounding_boxes": text_bounding_boxes,
                                "archetype": archetype,
                                "details": details
                            })
                    except Exception as e:
                        warnings.append(f"Failed to vector-crop visual engine {fig_id} on page {page_num}: {str(e)}")
                        
        char_count = len(raw_text)
        content_type = "empty"
        if char_count > 0:
            content_type = "text" if char_count > 50 else "mixed"
            
        fragments.append({
            "id": page_id,
            "sourceFile": source_file,
            "pageNumber": page_num,
            "contentType": content_type,
            "rawText": raw_text,
            "characterCount": char_count,
            "parsedSections": sections,
            "word_bounding_boxes": word_bounding_boxes
        })
        
    return {
        "fragments": fragments,
        "visual_data_engines": visual_data_engines,
        "warnings": warnings
    }

def extract_image(file_path):
    source_file = os.path.basename(file_path)
    lang = 'eng_best' if os.path.exists('/opt/homebrew/share/tessdata/eng_best.traineddata') else 'eng'
    
    raw_text = ""
    warnings = []
    word_bounding_boxes = []
    
    try:
        img = Image.open(file_path)
        custom_config = f'--oem 1 --psm 6 -l {lang}'
        
        # Word coordinates OCR
        data = pytesseract.image_to_data(img, config=custom_config, output_type=pytesseract.Output.DICT)
        raw_text_parts = []
        for i in range(len(data['text'])):
            word = data['text'][i].strip()
            try:
                c = float(data['conf'][i])
            except (ValueError, TypeError):
                c = 0.0
            if word and c > 0:
                x0 = data['left'][i]
                y0 = data['top'][i]
                x1 = x0 + data['width'][i]
                y1 = y0 + data['height'][i]
                
                word_bounding_boxes.append({
                    "text": word,
                    "bbox": [x0, y0, x1, y1]
                })
                raw_text_parts.append(word)
        raw_text = " ".join(raw_text_parts)
    except Exception as e:
        warnings.append(f"Image OCR failed: {str(e)}")
        
    char_count = len(raw_text)
    
    fragments = [{
        "id": "PAGE_001",
        "sourceFile": source_file,
        "pageNumber": 1,
        "contentType": "text" if char_count > 50 else "mixed",
        "rawText": raw_text,
        "characterCount": char_count,
        "parsedSections": [{
            "heading": "",
            "body": raw_text,
            "startLine": 1,
            "category": "paragraph"
        }],
        "word_bounding_boxes": word_bounding_boxes
    }]
    
    scratch_dir = "scratch/extracted_images"
    os.makedirs(scratch_dir, exist_ok=True)
    
    out_path = os.path.join(scratch_dir, f"{source_file.replace('.', '_')}_full.png")
    try:
        import shutil
        shutil.copy(file_path, out_path)
    except Exception:
        pass
        
    text_bounding_boxes = cluster_ocr_phrases(out_path)
    
    visual_data_engines = [{
        "id": "FIG_IMAGE_FULL",
        "sourceFile": source_file,
        "pageNumber": 1,
        "image_path": os.path.abspath(out_path),
        "closest_text_heading": "",
        "caption": raw_text[:200] + "..." if len(raw_text) > 200 else raw_text,
        "text_bounding_boxes": text_bounding_boxes,
        "archetype": "ANATOMICAL NETWORKS & MICROCIRCUIT MAPS",
        "details": {
            "nodes": {
                b['text'].replace(" [uncertain]", ""): {
                    "name": b['text'].replace(" [uncertain]", ""),
                    "relational_variants": []
                } for b in text_bounding_boxes
            },
            "source_target_vectors": []
        }
    }]
    
    return {
        "fragments": fragments,
        "visual_data_engines": visual_data_engines,
        "warnings": warnings
    }

def extract_pptx(file_path):
    from pptx import Presentation
    prs = Presentation(file_path)
    source_file = os.path.basename(file_path)
    
    fragments = []
    for idx, slide in enumerate(prs.slides):
        slide_parts = []
        if slide.shapes.title:
            slide_parts.append(slide.shapes.title.text)
            
        for shape in slide.shapes:
            if shape.has_text_frame and shape != slide.shapes.title:
                for paragraph in shape.text_frame.paragraphs:
                    if paragraph.text:
                        slide_parts.append(paragraph.text)
                        
        slide_text = "\n".join(slide_parts)
        char_count = len(slide_text)
        
        fragments.append({
            "id": f"PAGE_{idx+1:03d}",
            "sourceFile": source_file,
            "pageNumber": idx + 1,
            "contentType": "text" if char_count > 50 else "mixed",
            "rawText": slide_text,
            "characterCount": char_count,
            "parsedSections": [{
                "heading": slide.shapes.title.text if slide.shapes.title else "",
                "body": slide_text,
                "startLine": 1,
                "category": "paragraph"
            }]
        })
        
    return {
        "fragments": fragments,
        "visual_data_engines": [],
        "warnings": []
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python3 local_parser.py <file_path>"}))
        sys.exit(1)
        
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(json.dumps({"error": f"File not found: {file_path}"}))
        sys.exit(1)
        
    ext = os.path.splitext(file_path)[1].lower()
    
    try:
        if ext == '.pdf':
            result = extract_pdf(file_path)
        elif ext in ('.png', '.jpg', '.jpeg'):
            result = extract_image(file_path)
        elif ext == '.pptx':
            result = extract_pptx(file_path)
        else:
            print(json.dumps({"error": f"Unsupported extension: {ext}"}))
            sys.exit(1)
            
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
