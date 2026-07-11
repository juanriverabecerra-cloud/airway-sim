import os
import json
import re

brain_dir = "/Users/jsriverab/.gemini/antigravity/brain"
found_file = False

# We will check each subfolder in the brain directory
for folder in os.listdir(brain_dir):
    folder_path = os.path.join(brain_dir, folder)
    if not os.path.isdir(folder_path):
        continue
    
    # Check for transcript_full.jsonl or transcript.jsonl
    log_dir = os.path.join(folder_path, ".system_generated", "logs")
    if not os.path.exists(log_dir):
        continue
        
    for log_file in ["transcript_full.jsonl", "transcript.jsonl"]:
        log_path = os.path.join(log_dir, log_file)
        if not os.path.exists(log_path):
            continue
            
        print(f"Checking {log_path}...")
        with open(log_path, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                if "ReceptorBodyPanel.jsx" in line:
                    try:
                        step = json.loads(line)
                        content = step.get("content", "")
                        
                        # Let's search for the view_file tool output or file content directly
                        # It should have the complete text of the file.
                        # Let's check if the file content pattern exists.
                        if "const SITE_META = {" in content and "function computeActivity(" in content:
                            # Extract the file content using a regex or simple search
                            # The transcript output has: "File Path: ...\nTotal Lines: ...\nShowing lines 1 to ...\n1: ...\n2: ..."
                            # Or it might be the raw JSON argument to write_to_file or replacement.
                            # Let's dump this to a text file for inspection.
                            print(f"FOUND candidate in {log_file} (Step {step.get('step_index')}) in folder {folder}")
                            with open(f"scratch/recovered_{folder}_{step.get('step_index')}.txt", "w", encoding="utf-8") as out:
                                out.write(content)
                            found_file = True
                            
                        # Also check if it's in tool calls arguments (e.g. write_to_file)
                        for tc in step.get("tool_calls", []):
                            if tc.get("name") == "write_to_file":
                                args = tc.get("args", {})
                                if "ReceptorBodyPanel.jsx" in args.get("TargetFile", ""):
                                    code = args.get("CodeContent", "")
                                    if "const SITE_META = {" in code:
                                        print(f"FOUND write_to_file content in {log_file} (Step {step.get('step_index')}) in folder {folder}")
                                        with open(f"scratch/recovered_write_{folder}_{step.get('step_index')}.txt", "w", encoding="utf-8") as out:
                                            out.write(code)
                                        found_file = True
                    except Exception as e:
                        pass

if found_file:
    print("Recovery scan complete. Check scratch/ folder for recovered files.")
else:
    print("No complete backup found in any log files.")
