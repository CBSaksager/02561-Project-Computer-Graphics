import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

input_files = [
    ("device_orientation_01.csv", "Parallel to ground", 0.6, 6.0, 0),
    ("device_orientation_02.csv", "45 degrees tilt", 1.8, 8, 0),
    ("device_orientation_03.csv", "Vertical position", 2, 6.5, -360),
]

output_dir = Path("output")
output_dir.mkdir(exist_ok=True)

for csv_file, title, start_s, end_s, offset in input_files:
    name = Path(csv_file).stem

    print(f"Processing {csv_file}")

    # Load CSV
    df = pd.read_csv(csv_file)

    # Relative time (seconds)
    t0 = df["timestamp_ms"].iloc[0]
    df["time_s"] = (df["timestamp_ms"] - t0) / 1000.0

    # Trim to relevant time window
    df = df[(df["time_s"] >= start_s) & (df["time_s"] <= end_s)].copy()
    t0 = df["time_s"].iloc[0]
    df["time_s"] = df["time_s"] - t0

    # Unwrap alpha (degrees → radians → unwrap → degrees)
    alpha_rad = np.deg2rad(df["alpha"].to_numpy())
    df["alpha_unwrapped"] = np.rad2deg(np.unwrap(alpha_rad))

    c_rad = np.deg2rad(df["c"].to_numpy())
    df["c_unwrapped"] = np.rad2deg(np.unwrap(c_rad))

    # Start at 0
    df['alpha_unwrapped'] = df['alpha_unwrapped'] - df['alpha_unwrapped'].iloc[0]
    df['c_unwrapped'] = df['c_unwrapped'] - df['c_unwrapped'].iloc[0]

    df = df.dropna()

    # Plot 1: Angles
    plt.figure(figsize=(6, 4))

    plt.plot(df["time_s"], df["alpha_unwrapped"], label="Alpha (Z)")
    plt.plot(df["time_s"], df["beta"], label="Beta (X)")
    plt.plot(df["time_s"], df["gamma"], label="Gamma (Y)")

    plt.xlabel("Time (seconds)")
    plt.ylabel("Angle (degrees)")
    plt.title(f"Device Orientation — {title}")
    plt.legend()
    plt.grid(True)

    plt.savefig(output_dir / f"{name}_angles.svg")
    plt.close()

    # Plot 2: Corrected values
    plt.figure(figsize=(6, 4))

    plt.plot(df["time_s"], df["a"], label="Forward")
    plt.plot(df["time_s"], df["b"], label="Right")
    plt.plot(df["time_s"], df["c_unwrapped"], label="Up")

    plt.xlabel("Time (seconds)")
    plt.ylabel("Angle (degrees)")
    plt.title(f"Device Orientation (Corrected) — {title}")
    plt.legend()
    plt.grid(True)

    plt.savefig(output_dir / f"{name}_corrected_angles.svg")
    plt.close()


print("All plots saved to ./output/")
