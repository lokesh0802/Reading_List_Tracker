import json, os

agents = ["backend", "frontend", "testing", "deployment", "qa"]

print("AI Agent Status")
print("----------------")

for agent in agents:
    file = f".agent/status/{agent}.json"
    if os.path.exists(file):
        with open(file) as f:
            data = json.load(f)
        print(agent, ":", data.get("status"))
    else:
        print(agent, ": waiting")