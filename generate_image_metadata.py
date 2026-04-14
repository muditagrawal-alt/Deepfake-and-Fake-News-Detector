import os
import pandas as pd

real_dir = "data/evaluation/images/real"
fake_dir = "data/evaluation/images/fake"

rows = []

# REAL images
for i, file in enumerate(sorted(os.listdir(real_dir))):
    if file.lower().endswith((".jpg", ".jpeg", ".png")):
        rows.append([f"img_{i+1:03d}", f"{real_dir}/{file}", "REAL"])

# FAKE images
for i, file in enumerate(sorted(os.listdir(fake_dir))):
    if file.lower().endswith((".jpg", ".jpeg", ".png")):
        rows.append([f"img_{i+26:03d}", f"{fake_dir}/{file}", "FAKE"])

# Create DataFrame
df = pd.DataFrame(rows, columns=["id", "path", "label"])

# Save to correct location
output_path = "data/evaluation/images/metadata.csv"
df.to_csv(output_path, index=False)

print(f"✅ Metadata created at: {output_path}")
print(f"Total samples: {len(df)}")