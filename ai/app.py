"""
app.py - Enhanced Flask Application for Interview Analysis
Integrates body language and voice sentiment with interview responses
Works with Next.js frontend and Express backend
"""

from flask import Flask, render_template, Response, jsonify, request
import cv2
import numpy as np
from nltk.sentiment import SentimentIntensityAnalyzer
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from scipy.special import softmax
import nltk
import tensorflow as tf
import json
from datetime import datetime
import threading
import queue
from flask_cors import CORS

# Download required NLTK data
try:
    nltk.download('vader_lexicon', quiet=True)
    nltk.download('punkt', quiet=True)
except:
    pass

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Enable CORS for Next.js

# Load CNN body language model
try:
    body_model = tf.keras.models.load_model('best_model.h5')
    print("✓ CNN body language model loaded successfully")
    IMG_SIZE = (96, 96)
except Exception as e:
    print(f"❌ Error loading CNN model: {e}")
    body_model = None
    IMG_SIZE = (96, 96)

# Initialize sentiment analyzers
sia = SentimentIntensityAnalyzer()

# Load RoBERTa model
MODEL = "cardiffnlp/twitter-roberta-base-sentiment"
try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL)
    roberta_model = AutoModelForSequenceClassification.from_pretrained(MODEL)
    print("✓ RoBERTa model loaded successfully")
except Exception as e:
    print(f"❌ Error loading RoBERTa model: {e}")
    roberta_model = None
    tokenizer = None

# Global variables
camera = None
active_sessions = {}  # Store multiple interview sessions

# Helper function to convert numpy types to JSON-serializable types
def convert_to_native(value):
    """Convert numpy types to Python native types"""
    if isinstance(value, (np.float32, np.float64)):
        return float(value)
    if isinstance(value, (np.int32, np.int64)):
        return int(value)
    if isinstance(value, np.ndarray):
        return value.tolist()
    return value

class InterviewSession:
    """Manages analysis for a single interview session"""
    def __init__(self, session_id):
        self.session_id = session_id
        self.body_language_scores = []
        self.voice_tone_scores = []
        self.analysis_results = {
            'body_language': 'Not Detected',
            'body_confidence': 0.0,
            'voice_tone_score': 0.0,
            'body_language_score': 0.0,
            'combined_score': 0.0,
            'overall_status': 'Neutral',
            'timestamp': '',
            'session_active': False,
            'question_analyses': []  # Store per-question analysis
        }
        self.is_recording = False
        self.camera = None
        
    def add_body_score(self, score):
        self.body_language_scores.append(float(score))
        if len(self.body_language_scores) > 100:  # Keep last 100 readings
            self.body_language_scores.pop(0)
    
    def add_voice_score(self, score):
        self.voice_tone_scores.append(float(score))
        if len(self.voice_tone_scores) > 50:
            self.voice_tone_scores.pop(0)
    
    def get_average_body_score(self):
        if not self.body_language_scores:
            return 50.0
        return float(np.mean(self.body_language_scores))
    
    def get_average_voice_score(self):
        if not self.voice_tone_scores:
            return 50.0
        return float(np.mean(self.voice_tone_scores))
    
    def calculate_combined_score(self):
        """Calculate weighted combined score"""
        body_avg = self.get_average_body_score()
        voice_avg = self.get_average_voice_score()
        
        # Weighted: 40% body language, 60% voice tone
        combined = (body_avg * 0.4) + (voice_avg * 0.6)
        
        self.analysis_results['body_language_score'] = float(round(body_avg, 2))
        self.analysis_results['voice_tone_score'] = float(round(voice_avg, 2))
        self.analysis_results['combined_score'] = float(round(combined, 2))
        
        # Determine status
        if combined >= 75:
            self.analysis_results['overall_status'] = 'Highly Confident'
        elif combined >= 60:
            self.analysis_results['overall_status'] = 'Confident'
        elif combined >= 40:
            self.analysis_results['overall_status'] = 'Neutral'
        else:
            self.analysis_results['overall_status'] = 'Needs Improvement'
        
        return float(combined)

class VideoCamera:
    def __init__(self):
        self.video = cv2.VideoCapture(0)
        self.last_predictions = []
        
    def __del__(self):
        if self.video is not None:
            self.video.release()
    
    def predict_confidence(self, frame):
        """Predict confidence from frame using CNN model"""
        if body_model is None:
            return None, 0.0
        
        try:
            img = cv2.resize(frame, IMG_SIZE)
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img_normalized = img_rgb.astype('float32') / 255.0
            img_input = np.expand_dims(img_normalized, axis=0)
            
            prediction = body_model.predict(img_input, verbose=0)[0][0]
            
            if prediction > 0.5:
                label = 'confident'
                confidence = float(prediction * 100)
            else:
                label = 'unconfident'
                confidence = float((1 - prediction) * 100)
            
            self.last_predictions.append(confidence if label == 'confident' else 100 - confidence)
            if len(self.last_predictions) > 30:
                self.last_predictions.pop(0)
            
            return label, confidence
            
        except Exception as e:
            print(f"Prediction error: {e}")
            return None, 0.0
    
    def get_average_confidence(self):
        """Get smoothed confidence score (0-100)"""
        if not self.last_predictions:
            return 50.0
        return float(max(0, min(100, np.mean(self.last_predictions))))
    
    def get_frame(self):
        """Capture frame"""
        success, image = self.video.read()
        if not success:
            return None, None
        
        image = cv2.flip(image, 1)
        prediction, confidence = self.predict_confidence(image)
        
        return image, (prediction, confidence)

def get_roberta_scores(text):
    """Get RoBERTa sentiment scores"""
    if roberta_model is None or tokenizer is None:
        return {'roberta_neg': 0, 'roberta_neu': 0, 'roberta_pos': 0}
    
    try:
        encoded = tokenizer(text, return_tensors='pt', truncation=True, max_length=512)
        output = roberta_model(**encoded)
        scores = output[0][0].detach().numpy()
        scores = softmax(scores)
        return {
            'roberta_neg': float(scores[0]),
            'roberta_neu': float(scores[1]),
            'roberta_pos': float(scores[2])
        }
    except Exception as e:
        print(f"RoBERTa error: {e}")
        return {'roberta_neg': 0, 'roberta_neu': 0, 'roberta_pos': 0}

def analyze_voice_tone(text):
    """Analyze voice sentiment and return 0-100 score"""
    # VADER sentiment
    vader_scores = sia.polarity_scores(text)
    compound = vader_scores.get('compound', 0)
    
    # RoBERTa sentiment
    roberta_scores = get_roberta_scores(text)
    roberta_positive = roberta_scores.get('roberta_pos', 0)
    
    # Convert to 0-100 scale
    vader_score = (compound + 1) * 50  # -1 to 1 -> 0 to 100
    roberta_score = roberta_positive * 100
    
    # Combined voice tone score (average of both)
    voice_score = (vader_score + roberta_score) / 2
    
    return {
        'voice_tone_score': round(voice_score, 2),
        'vader': vader_scores,
        'roberta': roberta_scores
    }

# ==================== API ENDPOINTS ====================

@app.route('/api/session/start', methods=['POST'])
def start_session():
    """Start a new interview analysis session"""
    data = request.json
    session_id = data.get('sessionId') or data.get('interviewId')
    
    if not session_id:
        return jsonify({'error': 'Session ID required'}), 400
    
    if session_id in active_sessions:
        return jsonify({'error': 'Session already active'}), 400
    
    session = InterviewSession(session_id)
    session.analysis_results['session_active'] = True
    session.camera = VideoCamera()
    active_sessions[session_id] = session
    
    # Start body language analysis thread
    thread = threading.Thread(target=analyze_body_language_continuous, args=(session_id,))
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'status': 'success',
        'sessionId': session_id,
        'message': 'Analysis session started'
    })

@app.route('/api/session/stop', methods=['POST'])
def stop_session():
    """Stop interview analysis session"""
    data = request.json
    session_id = data.get('sessionId') or data.get('interviewId')
    
    if session_id not in active_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session = active_sessions[session_id]
    session.analysis_results['session_active'] = False
    
    if session.camera:
        del session.camera
    
    # Get final results - convert all numpy types
    final_results = {
        'sessionId': session_id,
        'body_language_score': float(session.get_average_body_score()),
        'voice_tone_score': float(session.get_average_voice_score()),
        'combined_score': float(session.calculate_combined_score()),
        'overall_status': session.analysis_results['overall_status'],
        'question_analyses': session.analysis_results['question_analyses']
    }
    
    del active_sessions[session_id]
    
    return jsonify({
        'status': 'success',
        'results': final_results
    })

@app.route('/api/analyze/transcript', methods=['POST'])
def analyze_transcript():
    """Analyze transcript with voice tone analysis"""
    data = request.json
    session_id = data.get('sessionId') or data.get('interviewId')
    transcript = data.get('transcript', '')
    question_id = data.get('questionId')
    
    if not session_id or not transcript:
        return jsonify({'error': 'Session ID and transcript required'}), 400
    
    # Analyze voice tone
    voice_analysis = analyze_voice_tone(transcript)
    
    # If session exists, add to scores
    if session_id in active_sessions:
        session = active_sessions[session_id]
        session.add_voice_score(voice_analysis['voice_tone_score'])
        
        # Store question-specific analysis
        question_analysis = {
            'questionId': question_id,
            'transcript': transcript,
            'voice_tone_score': voice_analysis['voice_tone_score'],
            'body_language_score': float(session.get_average_body_score()),
            'timestamp': datetime.now().isoformat()
        }
        session.analysis_results['question_analyses'].append(question_analysis)
    
    return jsonify({
        'status': 'success',
        'voiceAnalysis': voice_analysis,
        'sessionId': session_id
    })

@app.route('/api/analyze/question-response', methods=['POST'])
def analyze_question_response():
    """
    Comprehensive analysis endpoint for a single question response
    Returns combined score for response + voice + body language
    """
    data = request.json
    session_id = data.get('sessionId') or data.get('interviewId')
    transcript = data.get('transcript', '')
    question_id = data.get('questionId')
    response_score = data.get('responseScore', 0)  # Score from LLM evaluation
    
    if not session_id:
        return jsonify({'error': 'Session ID required'}), 400
    
    # Voice tone analysis
    voice_analysis = analyze_voice_tone(transcript)
    voice_score = voice_analysis['voice_tone_score']
    
    # Body language score
    body_score = 50.0  # Default
    if session_id in active_sessions:
        session = active_sessions[session_id]
        body_score = float(session.get_average_body_score())
        session.add_voice_score(voice_score)
    
    # Calculate final combined score
    # Weights: 50% response content, 25% voice tone, 25% body language
    final_score = (response_score * 0.5) + (voice_score * 0.25) + (body_score * 0.25)
    
    result = {
        'status': 'success',
        'questionId': question_id,
        'scores': {
            'response': round(response_score, 2),
            'voiceTone': round(voice_score, 2),
            'bodyLanguage': round(body_score, 2),
            'final': round(final_score, 2)
        },
        'breakdown': {
            'responseWeight': '50%',
            'voiceWeight': '25%',
            'bodyWeight': '25%'
        },
        'voiceAnalysis': voice_analysis,
        'timestamp': datetime.now().isoformat()
    }
    
    return jsonify(result)

@app.route('/api/session/status', methods=['GET'])
def get_session_status():
    """Get current analysis status for a session"""
    session_id = request.args.get('sessionId')
    
    if not session_id or session_id not in active_sessions:
        return jsonify({'active': False})
    
    session = active_sessions[session_id]
    session.calculate_combined_score()
    
    # Convert all numpy types to native Python types
    results = {
        'body_language': session.analysis_results['body_language'],
        'body_confidence': float(session.analysis_results.get('body_confidence', 0.0)),
        'voice_tone_score': float(session.analysis_results.get('voice_tone_score', 0.0)),
        'body_language_score': float(session.analysis_results.get('body_language_score', 0.0)),
        'combined_score': float(session.analysis_results.get('combined_score', 0.0)),
        'overall_status': session.analysis_results['overall_status'],
        'timestamp': session.analysis_results['timestamp'],
        'session_active': session.analysis_results['session_active'],
        'question_analyses': session.analysis_results['question_analyses']
    }
    
    return jsonify({
        'active': True,
        'results': results
    })

@app.route('/api/video-feed/<session_id>')
def video_feed(session_id):
    """Video streaming route for specific session"""
    if session_id not in active_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    def generate():
        session = active_sessions.get(session_id)
        if not session or not session.camera:
            return
        
        while session.analysis_results['session_active']:
            frame, analysis = session.camera.get_frame()
            if frame is not None:
                # Add overlay
                if analysis[0] is not None:
                    prediction, confidence = analysis
                    color = (0, 255, 0) if prediction == 'confident' else (0, 165, 255)
                    cv2.rectangle(frame, (10, 10), (400, 80), (0, 0, 0), -1)
                    cv2.putText(frame, f'Body Language: {prediction.upper()}', 
                               (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
                    cv2.putText(frame, f'Confidence: {confidence:.1f}%', 
                               (20, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                
                ret, jpeg = cv2.imencode('.jpg', frame)
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
    
    return Response(generate(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

def analyze_body_language_continuous(session_id):
    """Continuous body language analysis in background"""
    session = active_sessions.get(session_id)
    if not session:
        return
    
    while session.analysis_results['session_active']:
        if session.camera:
            frame, analysis = session.camera.get_frame()
            if frame is not None and analysis[0] is not None:
                prediction, confidence = analysis
                score = session.camera.get_average_confidence()
                session.add_body_score(score)
                
                session.analysis_results['body_language'] = prediction.capitalize()
                session.analysis_results['body_confidence'] = float(round(confidence, 2))
                session.analysis_results['timestamp'] = datetime.now().strftime("%H:%M:%S")

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'models': {
            'body_language': body_model is not None,
            'roberta': roberta_model is not None
        },
        'active_sessions': len(active_sessions)
    })

if __name__ == '__main__':
    print("\n" + "="*60)
    print(" "*10 + "INTERVIEW ANALYSIS SERVER")
    print("="*60)
    print("\n🌐 Starting Flask server on http://127.0.0.1:5001")
    print("📹 Body language analysis: CNN model")
    print("🎤 Voice sentiment analysis: VADER + RoBERTa")
    print("🔗 CORS enabled for Next.js frontend")
    print("\n" + "="*60 + "\n")
    
    app.run(host='0.0.0.0', port=5001, debug=True, threaded=True, use_reloader=False)