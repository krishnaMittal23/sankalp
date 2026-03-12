import cv2
import numpy as np
import os
import glob
from tqdm import tqdm
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

np.random.seed(42)
tf.random.set_seed(42)

print("Libraries loaded.")

gpus = tf.config.experimental.list_physical_devices('GPU')
print(f"GPUs Available: {len(gpus)}")
for gpu in gpus:
    tf.config.experimental.set_memory_growth(gpu, True)

strategy = tf.distribute.MirroredStrategy()
print(f'Number of devices: {strategy.num_replicas_in_sync}')


def extract_frames_from_video(video_path, max_frames=30):
    cap = cv2.VideoCapture(video_path)
    frames = []
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    skip = max(1, total_frames // max_frames)
    frame_count = 0
    
    while cap.isOpened() and len(frames) < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        
        if frame_count % skip == 0:
            frames.append(frame)
        
        frame_count += 1
    
    cap.release()
    return frames


def load_dataset(data_folder='sorted_data', img_size=(96, 96)):
    X = []
    y = []
    
    image_exts = ['*.jpg', '*.jpeg', '*.png', '*.bmp', '*.JPG', '*.JPEG', '*.PNG']
    video_exts = ['*.mp4', '*.avi', '*.mov', '*.mkv', '*.MP4', '*.AVI', '*.MOV']
    
    stats = {'confident': {'images': 0, 'videos': 0, 'frames': 0, 'failed': 0},
             'unconfident': {'images': 0, 'videos': 0, 'frames': 0, 'failed': 0}}
    
    label_map = {'confident': 1, 'unconfident': 0}
    
    for class_name in ['confident', 'unconfident']:
        class_folder = os.path.join(data_folder, class_name)
        
        if not os.path.exists(class_folder):
            print(f" Warning: {class_folder} not found!")
            continue
        
        print(f"\n{'='*60}")
        print(f"Processing {class_name.upper()} samples...")
        print(f"{'='*60}")
        
        # Process images
        image_files = []
        for ext in image_exts:
            image_files.extend(glob.glob(os.path.join(class_folder, ext)))
        
        print(f"\nProcessing {len(image_files)} images...")
        for img_path in tqdm(image_files, desc=f"{class_name} images"):
            try:
                img = cv2.imread(img_path)
                if img is not None:
                    img = cv2.resize(img, img_size)
                    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    X.append(img)
                    y.append(label_map[class_name])
                    stats[class_name]['images'] += 1
                else:
                    stats[class_name]['failed'] += 1
            except Exception as e:
                stats[class_name]['failed'] += 1
        
        video_files = []
        for ext in video_exts:
            video_files.extend(glob.glob(os.path.join(class_folder, ext)))
        
        print(f"\nProcessing {len(video_files)} videos...")
        for vid_path in tqdm(video_files, desc=f"{class_name} videos"):
            try:
                frames = extract_frames_from_video(vid_path, max_frames=30)
                if frames:
                    for frame in frames:
                        frame_resized = cv2.resize(frame, img_size)
                        frame_rgb = cv2.cvtColor(frame_resized, cv2.COLOR_BGR2RGB)
                        X.append(frame_rgb)
                        y.append(label_map[class_name])
                    stats[class_name]['videos'] += 1
                    stats[class_name]['frames'] += len(frames)
                else:
                    stats[class_name]['failed'] += 1
            except Exception as e:
                stats[class_name]['failed'] += 1
    
    return np.array(X), np.array(y), stats


def build_cnn_model(input_shape=(96, 96, 3)):
    model = models.Sequential([
        
        layers.Conv2D(32, (3, 3), activation='relu', padding='same', input_shape=input_shape),
        layers.BatchNormalization(),
        layers.Conv2D(32, (3, 3), activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),
        
        
        layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),
        
        
        layers.Conv2D(128, (3, 3), activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.Conv2D(128, (3, 3), activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),
        
        
        layers.Flatten(),
        layers.Dense(256, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.5),
        layers.Dense(64, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(1, activation='sigmoid')
    ])
    
    return model


def train_model():
    print("\n" + "="*60)
    print(" "*15 + "CNN MODEL TRAINING")
    print("="*60)
    
    if not os.path.exists('sorted_data'):
        print("\n Error: 'sorted_data' folder not found!")
        return None
    print("\nLoading dataset...")
    X, y, stats = load_dataset('sorted_data')
    
    if len(X) == 0:
        print("\n No data loaded!")
        return None
    
    # Print statistics
    print("\n" + "="*60)
    print("DATASET STATISTICS")
    print("="*60)
    
    for class_name in ['confident', 'unconfident']:
        s = stats[class_name]
        label = 1 if class_name == 'confident' else 0
        total = np.sum(y == label)
        print(f"\n{class_name.upper()}:")
        print(f"  Images processed: {s['images']}")
        print(f"  Videos processed: {s['videos']}")
        print(f"  Video frames extracted: {s['frames']}")
        print(f"  Failed detections: {s['failed']}")
        print(f"  Total samples: {total}")
    
    confident_count = np.sum(y == 1)
    unconfident_count = np.sum(y == 0)
    
    print(f"\n{'='*60}")
    print(f"Total samples: {len(X)}")
    print(f"Image shape: {X.shape}")
    print(f"Confident: {confident_count} | Unconfident: {unconfident_count}")
    
    X = X.astype('float32') / 255.0
    

    print(f"\n{'='*60}")
    print(" Splitting dataset...")
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        print("  Stratified split successful")
    except ValueError:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        print(" Using regular split")
    
    print(f"  Training: {len(X_train)} samples")
    print(f"  Testing: {len(X_test)} samples")
    
    class_weight = {
        0: len(y_train) / (2 * np.sum(y_train == 0)),
        1: len(y_train) / (2 * np.sum(y_train == 1))
    }
    print(f"\n Class weights: {class_weight}")
    
    print(f"\n{'='*60}")
    
    with strategy.scope():
        model = build_cnn_model()
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy', tf.keras.metrics.Precision(), tf.keras.metrics.Recall()]
        )
    
    model.summary()
    
    callbacks = [
        EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True),
        ModelCheckpoint('best_model.h5', monitor='val_accuracy', save_best_only=True)
    ]
    
    print(f"\n{'='*60}")
    print(" Training model...")
    
    history = model.fit(
        X_train, y_train,
        validation_split=0.2,
        epochs=30,
        batch_size=32,
        class_weight=class_weight,
        callbacks=callbacks,
        verbose=1
    )
    

    print(f"\n{'='*60}")
    print(" Evaluating on test set...")
    
    y_pred_prob = model.predict(X_test, verbose=0)
    y_pred = (y_pred_prob > 0.5).astype(int).flatten()
    
    test_loss, test_acc, test_precision, test_recall = model.evaluate(X_test, y_test, verbose=0)
    
    print(f"\n TEST ACCURACY: {test_acc*100:.2f}%")
    print(f"   Precision: {test_precision*100:.2f}%")
    print(f"   Recall: {test_recall*100:.2f}%")
    print("="*60)
    
    print("\nClassification Report:")
    print("-"*60)
    print(classification_report(y_test, y_pred, target_names=['Unconfident', 'Confident']))
    
    print("\nConfusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(cm)
    
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    axes[0].plot(history.history['accuracy'], label='Train Accuracy')
    axes[0].plot(history.history['val_accuracy'], label='Val Accuracy')
    axes[0].set_title('Model Accuracy')
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Accuracy')
    axes[0].legend()
    axes[0].grid(True)
    
    axes[1].plot(history.history['loss'], label='Train Loss')
    axes[1].plot(history.history['val_loss'], label='Val Loss')
    axes[1].set_title('Model Loss')
    axes[1].set_xlabel('Epoch')
    axes[1].set_ylabel('Loss')
    axes[1].legend()
    axes[1].grid(True)
    
    plt.tight_layout()
    plt.savefig('training_history.png')
    print("\nTraining plots saved to 'training_history.png'")
    
    # Confusion matrix heatmap
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                xticklabels=['Unconfident', 'Confident'],
                yticklabels=['Unconfident', 'Confident'])
    plt.title('Confusion Matrix')
    plt.ylabel('Actual')
    plt.xlabel('Predicted')
    plt.savefig('confusion_matrix.png')
    print(" Confusion matrix saved to 'confusion_matrix.png'")
    
    # Save model
    print(f"\n{'='*60}")
    print(" Saving model...")
    model.save('confidence_cnn_model.h5')
    print("  Model saved to 'confidence_cnn_model.h5'")
    
    print("\n" + "="*60)
    print("TRAINING COMPLETE!")
    print("="*60)
    
    return model, history


if __name__ == '__main__':
    model, history = train_model()