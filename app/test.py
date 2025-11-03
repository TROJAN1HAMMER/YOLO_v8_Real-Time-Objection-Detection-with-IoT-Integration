import serial
import time

try:
    arduino = serial.Serial("COM5", 115200, timeout=1)
    time.sleep(2)
    print("✅ Connected to Arduino!")

    # Send test data
    arduino.write(b'1')
    print("Sent 1")

    time.sleep(1)
    arduino.write(b'0')
    print("Sent 0")

    arduino.close()
except Exception as e:
    print(f"❌ Error: {e}")
