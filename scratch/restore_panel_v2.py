import json
import os

transcript_path = "/Users/jsriverab/.gemini/antigravity/brain/ff92a427-3657-4ec1-aecb-e7683ff23de6/.system_generated/logs/transcript_full.jsonl"

found_content = None

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            step = json.loads(line)
            content = step.get("content", "")
            # Look for the exact code structure of ReceptorBodyPanel.jsx
            if "const SITE_META = {" in content and "function computeActivity(" in content:
                print(f"FOUND IN CONTENT (Step {step.get('step_index')})")
                found_content = content
                # We want the latest one, so we don't break yet
        except Exception as e:
            pass

if found_content:
    # If the step is in markdown or contains diff info, we might need to extract the raw code.
    # But usually, it's either written via write_to_file or read via view_file.
    # Let's save the raw content to a recovered file first.
    with open("scratch/recovered_raw.txt", "w", encoding="utf-8") as out:
        out.write(found_content)
    print("SAVED TO scratch/recovered_raw.txt")
else:
    print("Not found in content. Let's look for tool_calls...")
    # Look for write_to_file or view_file tool calls
    with open(transcript_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                step = json.loads(line)
                for tc in step.get("tool_calls", []):
                    if tc.get("name") == "write_to_file":
                        args = tc.get("args", {})
                        if "ReceptorBodyPanel.jsx" in args.get("TargetFile", ""):
                            code = args.get("CodeContent", "")
                            if "const SITE_META = {" in code:
                                print(f"FOUND IN write_to_file tool call (Step {step.get('step_index')})")
                                with open("scratch/recovered_raw.txt", "w", encoding="utf-8") as out:
                                    out.write(code)
                                print("SAVED TO scratch/recovered_raw.txt")
                                break
            except Exception as e:
                pass
