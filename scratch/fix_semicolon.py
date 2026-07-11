with open("src/components/ReceptorBodyPanel.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the merged/duplicate };};
fixed_content = content.replace("};};// ───", "};\\n\\n// ───")
# If it's single backslash:
if "};};// ───" not in content and "};};" in content:
    fixed_content = content.replace("};};", "};\\n\\n")

with open("src/components/ReceptorBodyPanel.jsx", "w", encoding="utf-8") as f:
    f.write(fixed_content)

print("FIX COMPLETE!")
