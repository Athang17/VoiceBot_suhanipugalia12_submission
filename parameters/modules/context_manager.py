import os
import json

class ConversationContext:
    def __init__(self):
        self.sessions = {}  # session_id -> list of message turns
        self.session_folder = os.path.join(os.path.dirname(__file__), "..", "session_store")
        os.makedirs(self.session_folder, exist_ok=True)

    def add_turn(self, session_id, role, content):
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        self.sessions[session_id].append({
            "role": role,
            "content": [{"type": "text", "text": content}]
        })

    def get_messages(self, session_id, max_turns=10):
        return self.sessions.get(session_id, [])[-max_turns:]

    def reset(self, session_id):
        self.sessions[session_id] = []

    def save_session(self, session_id):
        if session_id in self.sessions:
            path = os.path.join(self.session_folder, f"{session_id}.json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(self.sessions[session_id], f, indent=2)

    def load_session(self, session_id):
        path = os.path.join(self.session_folder, f"{session_id}.json")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                self.sessions[session_id] = json.load(f)