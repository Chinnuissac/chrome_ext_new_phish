from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware

from transformers import BertTokenizer, BertForSequenceClassification
import torch
import torch.nn.functional as F

app = FastAPI()

# ✅ Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# LOAD YOUR TRAINED MODEL
# -----------------------------
MODEL_PATH = r"C:\Users\ADMIN\Desktop\AI_phishing_email_detection\model\final_model"

tokenizer = BertTokenizer.from_pretrained(MODEL_PATH)
model = BertForSequenceClassification.from_pretrained(MODEL_PATH)
model.eval()

# -----------------------------
# REQUEST MODELS
# -----------------------------
class Email(BaseModel):
    subject: str
    sender: str
    body: str

class EmailList(BaseModel):
    emails: List[Email]

# -----------------------------
# LABEL → CATEGORY + COLOR
# -----------------------------
def map_label(predicted_class):
    if predicted_class in [0, 2]:
        return "Legitimate", "green"
    elif predicted_class == 1:
        return "Human Phishing", "yellow"
    elif predicted_class == 3:
        return "AI Phishing", "red"

# -----------------------------
# PREDICT FUNCTION (BERT)
# -----------------------------
def predict_text(text):
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=512
    )

    with torch.no_grad():
        outputs = model(**inputs)

    probs = F.softmax(outputs.logits, dim=1)[0]
    predicted_class = torch.argmax(probs).item()
    confidence = probs[predicted_class].item()

    return predicted_class, confidence

# -----------------------------
# BULK API
# -----------------------------
@app.post("/predict_bulk")
def predict_bulk(data: EmailList):
    results = []

    for email in data.emails:
        text = (email.subject + " " + email.body).strip()

        if not text:
            continue

        predicted_class, confidence = predict_text(text)
        category, color = map_label(predicted_class)

        results.append({
            "label": predicted_class,
            "category": category,
            "color": color,
            "confidence": round(confidence * 100, 2)
        })

    return {"results": results}
