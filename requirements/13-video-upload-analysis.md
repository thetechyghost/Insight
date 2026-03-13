# Video Upload & Analysis -- Functional Requirements

This document defines the functional requirements for the Video Upload & Analysis domain of the Insight fitness platform. The Video Upload & Analysis domain encompasses all capabilities related to athlete video capture and submission, coach-side video review and annotation, and organizational video library management. These features enable coaches to provide asynchronous movement feedback and allow athletes to track their technique progression over time.

All requirements use the identifier format **FR-VA-NNN** (Functional Requirement -- Video & Analysis).

---

## 1. Video Upload (Athlete Side)

FR-VA-001
The system shall allow athletes to record workout videos directly from their mobile device camera and upload them to the platform.

FR-VA-002
The system shall allow athletes to upload videos from their device camera roll or photo library.

FR-VA-003
The system shall provide video trimming controls that allow athletes to set start and end points before uploading.

FR-VA-004
The system shall support multiple video uploads per workout session, enabling athletes to attach more than one clip to a single logged workout.

FR-VA-005
The system shall allow athletes to tag each uploaded video with a movement type, date, and workout context.

FR-VA-006
The system shall apply video compression prior to upload to reduce file size while preserving acceptable visual quality for movement analysis.

FR-VA-007
The system shall display an upload progress indicator and shall support resumable uploads so that interrupted transfers can continue from the point of interruption.

FR-VA-008
The system shall support offline video recording and shall queue recorded videos for automatic upload when network connectivity is restored.

FR-VA-009
The system shall provide video privacy settings that allow athletes to restrict visibility to coach-only, gym-visible, or public.

FR-VA-010
The system shall enforce a maximum video duration that is configurable on a per-tenant basis.

---

## 2. Video Review & Annotation (Coach Side)

FR-VA-011
The system shall provide a video review queue for coaches, displaying submitted videos with statuses of pending, in-progress, and completed.

FR-VA-012
The system shall provide frame-by-frame playback controls, allowing coaches to advance or rewind one frame at a time.

FR-VA-013
The system shall support slow-motion playback at configurable speeds, including at minimum 0.25x and 0.5x normal speed.

FR-VA-014
The system shall allow coaches to zoom and pan on individual video frames during review.

FR-VA-015
The system shall provide a freehand drawing annotation tool that allows coaches to draw directly on video frames.

FR-VA-016
The system shall provide a straight line annotation tool for marking positions and alignments on video frames.

FR-VA-017
The system shall provide an angle measurement annotation tool that calculates and displays the angle between two lines drawn on a video frame.

FR-VA-018
The system shall provide circle and highlight annotation tools for emphasizing specific areas of a video frame.

FR-VA-019
The system shall provide an arrow annotation tool for indicating direction of movement or points of interest on video frames.

FR-VA-020
The system shall support text overlay annotations that allow coaches to place descriptive text directly on video frames.

FR-VA-021
The system shall support voice-over recording, allowing coaches to record audio commentary synchronized with video playback.

FR-VA-022
The system shall support telestrator-style annotations that persist and track through consecutive frames during playback.

FR-VA-023
The system shall support side-by-side video comparison, including comparison against a reference video, a previous attempt by the same athlete, or videos of two different athletes.

FR-VA-024
The system shall provide annotation templates for common corrections per movement type, allowing coaches to apply predefined annotations efficiently.

FR-VA-025
The system shall support timestamp-based comments, allowing coaches to attach textual feedback to specific moments in the video timeline.

FR-VA-026
The system shall allow coaches to provide an overall video feedback summary in either text or audio format.

FR-VA-027
The system shall allow coaches to share an annotated video back to the athlete and shall trigger a notification to the athlete upon sharing.

---

## 3. Video Management

FR-VA-028
The system shall maintain a video library for each athlete, organized by movement type and date.

FR-VA-029
The system shall maintain a coach video library containing annotated reviews and demonstration videos.

FR-VA-030
The system shall support video tagging and categorization to enable structured organization of video content.

FR-VA-031
The system shall provide video search and filtering capabilities, allowing users to locate videos by movement type, date, athlete, tag, and other metadata.

FR-VA-032
The system shall enforce configurable storage management and retention policies, including automatic archival or deletion of videos that exceed the defined retention period.

FR-VA-033
The system shall support adaptive bitrate streaming to optimize video playback quality based on the viewer's network conditions.

FR-VA-034
The system shall automatically generate thumbnail images for each uploaded video.

FR-VA-035
The system shall track video analytics, including view counts and engagement metrics, for each video in the library.
