with open("src/components/ReceptorBodyPanel.jsx", "r", encoding="utf-8", errors="replace") as f:
    lines = f.readlines()

for idx in range(935, 975):
    if idx <= len(lines):
        print(f"{idx}: {lines[idx-1]}", end="")
