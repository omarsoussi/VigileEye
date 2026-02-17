
**1 Intelligent Real-Time Video Stream Surveillance and Analysis System**

**Context and Problem Statement**  
The security of public and private spaces can no longer rely solely on passive human monitoring, which is often limited by fatigue, lack of responsiveness, and the ever-increasing volume of video data to be analyzed. The current challenge is to transform raw video streams into actionable information automatically and in real time. Thanks to recent advances in **Computer Vision** and **Artificial Intelligence**, it is now possible to automatically detect critical events such as: the presence or intrusion of individuals in restricted areas, abnormal crowd gatherings, people counting, detection and recognition of specific objects, etc. This project aligns with this trend and aims to design an intelligent solution capable of analyzing a live video stream to enhance security and support decision-making.

**Project Objectives**  
The main objective of this project is to develop an intelligent surveillance system based on **Computer Vision**, capable of analyzing video streams in real time and automatically detecting predefined events. The specific objectives are:  
• Detect and classify objects in real time (people, vehicles, specific objects, etc.).  
• Analyze movements and behaviors within the video scene.  
• Identify intrusions and anomalies in sensitive areas.  
• Generate automatic and actionable alerts.  
• Provide a visualization interface and statistics monitoring dashboard.

**Main Features**  
• **Object Detection and Recognition**: The system must be able to identify and classify in real time the objects present in the camera field of view, while supporting multiple object categories (people, vehicles, context-specific objects).  
• **Stream and Behavior Analysis**: The system must allow the user to define restricted zones (**Regions of Interest – ROI**) and must be able to detect crossings of these zones. It must also be capable of identifying crowds or abnormal behaviors.  
• **Data Visualization and Exploitation**: The system must provide real-time display of alerts, generate zone occupancy statistics, and produce **heatmaps** to analyze the most frequented areas.

**Functional Specifications (Expected Deliverables)**  
**1. Computer Vision Module (core of the project)**  
**1.1. Object Detection**  
• Recommended use of a pre-trained object detection model (**YOLO – You Only Look Once**).  
• Real-time detection of entities present in the video stream.  
• Logging of important events in a database including:  
  - Date and time,  
  - Type of detected object,  
  - Screenshot or associated image of the event.  

**1.2. Object Tracking**  
• Assignment of a unique identifier to each detected person.  
• Tracking of person movements to avoid double counting.  

**1.3. Counting and Zone Management**  
• Definition of restricted zones (**Regions of Interest – ROI**).  
• Automatic counting of entries and exits.  
• Intrusion detection when an object enters a restricted zone.  

**2. Alerts and Notifications Module**  
• Automatic detection of anomalies (e.g., intrusion into a forbidden zone at an unauthorized time).  
• Real-time alert generation.  
• Notification delivery via:  
  - Push notifications on mobile application,  
  - Emails containing a capture of the detected event.  

**3. Web Dashboard**  
• Display of the live video stream (**Live Stream**) with overlay of detection zones (**bounding boxes**).  
• Statistics and analytics (graphs showing the evolution of occupancy by hour and by day).  
• Event history:  
  - Consultation of past events,  
  - Filters by date, object type, and anomaly type.

**Suggested Technologies and Tools**  
• **Computer Vision**: OpenCV.  
• **Artificial Intelligence Model**: **YOLOv8**, **YOLOv10**, or the latest version available (e.g., **YOLOv26** from Ultralytics as of 2026).  
• **Programming Language**: Python.  
• **Backend / Web Dashboard**: Streamlit, Django, or FastAPI.  
• **Mobile Application (for alerts)**: Flutter or React Native.  
• **Notifications**: Firebase Cloud Messaging (**FCM**).  
• **Database**: MongoDB or PostgreSQL.

**Expected Results**  
At the end of the project, the student must deliver a functional solution capable of processing a real-time video stream, automatically detecting and analyzing security-related events, generating relevant alerts, and providing a clear interface for data visualization and monitoring.