import { Pose, type Results } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";

export interface StressAnalysis {
    state: "calm" | "vigilance" | "tense";
    confidence: number;
    details: {
        posture: number;
        movement: number;
        fidgeting: number;
        handFidgeting: number;
        legBouncing: number;
    };
}

export class MediapipePoseService {
    private pose: Pose | null = null;
    private camera: Camera | null = null;
    private videoElement: HTMLVideoElement | null = null;
    private canvasElement: HTMLCanvasElement | null = null;
    private canvasCtx: CanvasRenderingContext2D | null = null;
    private lastPoseLandmarks: any[] = [];
    private movementHistory: number[] = [];
    private fidgetingCount: number = 0;
    private lastKneePositions: {
        left: { x: number; y: number } | null;
        right: { x: number; y: number } | null;
    } = { left: null, right: null };
    private legBounceHistory: {
        timestamp: number;
        direction: "up" | "down" | null;
    }[] = [];
    private lastFrameTime: number = 0;
    private isInitialized: boolean = false;
    private onResultsCallback: ((results: Results) => void) | null = null;
    private onStressUpdateCallback:
        | ((stressAnalysis: StressAnalysis) => void)
        | null = null;

    async initialize(
        videoElement: HTMLVideoElement,
        canvasElement: HTMLCanvasElement,
        onResults: (results: Results) => void,
        onStressUpdate: (stressAnalysis: StressAnalysis) => void
    ): Promise<boolean> {
        try {
            this.videoElement = videoElement;
            this.canvasElement = canvasElement;
            this.canvasCtx = canvasElement.getContext("2d");
            this.onResultsCallback = onResults;
            this.onStressUpdateCallback = onStressUpdate;

            this.pose = new Pose({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                },
            });

            this.pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });

            this.pose.onResults(this.onPoseResults.bind(this));

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error("Error initializing Mediapipe Pose:", error);
            return false;
        }
    }

    async start(): Promise<boolean> {
        if (!this.isInitialized || !this.videoElement || !this.canvasElement) {
            return false;
        }

        try {
            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.pose && this.videoElement) {
                        await this.pose.send({ image: this.videoElement });
                    }
                },
                width: 640,
                height: 480,
            });

            await this.camera.start();
            return true;
        } catch (error) {
            console.error("Error starting camera:", error);
            return false;
        }
    }

    stop(): void {
        if (this.camera) {
            this.camera.stop();
            this.camera = null;
        }
    }

    private onPoseResults(results: Results): void {
        if (!this.canvasCtx || !this.canvasElement) return;

        // Clear and draw the video frame
        this.canvasCtx.save();
        this.canvasCtx.clearRect(
            0,
            0,
            this.canvasElement.width,
            this.canvasElement.height
        );
        this.canvasCtx.drawImage(
            results.image,
            0,
            0,
            this.canvasElement.width,
            this.canvasElement.height
        );

        // Draw pose landmarks
        if (results.poseLandmarks) {
            this.drawConnectors(this.canvasCtx, results.poseLandmarks);
            this.drawLandmarks(this.canvasCtx, results.poseLandmarks);

            // Analyze stress based on pose landmarks
            const stressAnalysis = this.analyzeStress(results.poseLandmarks);

            // Update stress state
            if (this.onStressUpdateCallback) {
                this.onStressUpdateCallback(stressAnalysis);
            }
        }

        this.canvasCtx.restore();

        if (this.onResultsCallback) {
            this.onResultsCallback(results);
        }
    }

    private drawConnectors(
        ctx: CanvasRenderingContext2D,
        landmarks: any[]
    ): void {
        const connections = [
            [11, 12],
            [11, 13],
            [13, 15],
            [12, 14],
            [14, 16], // Arms
            [11, 23],
            [12, 24],
            [23, 24], // Torso
            [23, 25],
            [25, 27],
            [24, 26],
            [26, 28], // Legs
        ];

        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 2;

        connections.forEach(([start, end]) => {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];

            if (
                startPoint &&
                endPoint &&
                startPoint.visibility > 0.5 &&
                endPoint.visibility > 0.5
            ) {
                ctx.beginPath();
                ctx.moveTo(
                    startPoint.x * ctx.canvas.width,
                    startPoint.y * ctx.canvas.height
                );
                ctx.lineTo(
                    endPoint.x * ctx.canvas.width,
                    endPoint.y * ctx.canvas.height
                );
                ctx.stroke();
            }
        });
    }

    private drawLandmarks(
        ctx: CanvasRenderingContext2D,
        landmarks: any[]
    ): void {
        ctx.fillStyle = "#FF0000";

        landmarks.forEach((landmark) => {
            if (landmark.visibility > 0.5) {
                ctx.beginPath();
                ctx.arc(
                    landmark.x * ctx.canvas.width,
                    landmark.y * ctx.canvas.height,
                    5,
                    0,
                    2 * Math.PI
                );
                ctx.fill();
            }
        });
    }

    private analyzeStress(landmarks: any[]): StressAnalysis {
        // Calculate posture score (0-1, higher is better)
        const postureScore = this.calculatePostureScore(landmarks);

        // Calculate movement score (0-1, higher is more movement)
        const movementScore = this.calculateMovementScore(landmarks);

        // Calculate separate fidgeting scores
        const handFidgetingScore = this.calculateHandFidgetingScore(landmarks);
        const legBouncingScore = this.calculateLegBouncingScore(landmarks);

        const combinedFidgetingScore =
            handFidgetingScore * 0.5 + legBouncingScore * 0.5;

        // Determine overall stress state
        let state: "calm" | "vigilance" | "tense";
        let confidence: number;

        if (
            postureScore > 0.7 &&
            movementScore < 0.3 &&
            combinedFidgetingScore < 0.2
        ) {
            state = "calm";
            confidence =
                (postureScore +
                    (1 - movementScore) +
                    (1 - combinedFidgetingScore)) /
                3;
        } else if (
            postureScore > 0.5 &&
            movementScore < 0.6 &&
            combinedFidgetingScore < 0.5
        ) {
            state = "vigilance";
            confidence = 0.7;
        } else {
            state = "tense";
            confidence =
                1 -
                postureScore +
                movementScore * 0.5 +
                combinedFidgetingScore * 0.5;
        }

        return {
            state,
            confidence: Math.min(Math.max(confidence, 0), 1),
            details: {
                posture: postureScore,
                movement: movementScore,
                fidgeting: combinedFidgetingScore,
                handFidgeting: handFidgetingScore,
                legBouncing: legBouncingScore,
            },
        };
    }

    private calculatePostureScore(landmarks: any[]): number {
        // Key landmarks for posture analysis
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const leftEar = landmarks[7];
        const rightEar = landmarks[8];

        if (
            !leftShoulder ||
            !rightShoulder ||
            !leftHip ||
            !rightHip ||
            !leftEar ||
            !rightEar
        ) {
            return 0.5; // Neutral score if landmarks are missing
        }

        // Calculate shoulder alignment (should be relatively horizontal)
        const shoulderSlope = Math.abs(leftShoulder.y - rightShoulder.y);

        // Calculate hip alignment (should be relatively horizontal)
        const hipSlope = Math.abs(leftHip.y - rightHip.y);

        // Calculate head alignment (ears should be above shoulders)
        const headAlignment = Math.abs(
            (leftEar.y + rightEar.y) / 2 -
                (leftShoulder.y + rightShoulder.y) / 2
        );

        // Calculate spine alignment (shoulders should be above hips)
        const spineAlignment = Math.abs(
            (leftShoulder.y + rightShoulder.y) / 2 -
                (leftHip.y + rightHip.y) / 2
        );

        // Normalize scores (lower is better, so we invert)
        const shoulderScore = Math.max(0, 1 - shoulderSlope * 5);
        const hipScore = Math.max(0, 1 - hipSlope * 5);
        const headScore = Math.max(0, 1 - headAlignment * 3);
        const spineScore = Math.max(0, 1 - spineAlignment * 3);

        // Calculate overall posture score
        return (shoulderScore + hipScore + headScore + spineScore) / 4;
    }

    private calculateMovementScore(landmarks: any[]): number {
        const currentTime = Date.now();

        // If this is the first frame, initialize and return 0
        if (this.lastPoseLandmarks.length === 0) {
            this.lastPoseLandmarks = [...landmarks];
            this.lastFrameTime = currentTime;
            return 0;
        }

        // Calculate time difference between frames
        const timeDiff = currentTime - this.lastFrameTime;
        if (timeDiff === 0) return 0;

        // Calculate average movement of all landmarks
        let totalMovement = 0;
        let validLandmarks = 0;

        landmarks.forEach((landmark, i) => {
            if (
                i < this.lastPoseLandmarks.length &&
                landmark.visibility > 0.5
            ) {
                const dx = landmark.x - this.lastPoseLandmarks[i].x;
                const dy = landmark.y - this.lastPoseLandmarks[i].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                totalMovement += distance;
                validLandmarks++;
            }
        });

        // Normalize by time and number of landmarks
        const avgMovement =
            validLandmarks > 0 ? totalMovement / validLandmarks : 0;
        const movementSpeed = avgMovement / (timeDiff / 1000); // Movement per second

        // Update history (keep last 10 values)
        this.movementHistory.push(movementSpeed);
        if (this.movementHistory.length > 10) {
            this.movementHistory.shift();
        }

        // Calculate average movement over history
        const avgMovementSpeed =
            this.movementHistory.reduce((sum, val) => sum + val, 0) /
            this.movementHistory.length;

        // Update for next frame
        this.lastPoseLandmarks = [...landmarks];
        this.lastFrameTime = currentTime;

        // Return normalized movement score (0-1, higher is more movement)
        return Math.min(avgMovementSpeed * 10, 1);
    }

    private calculateHandFidgetingScore(landmarks: any[]): number {
        const keyPoints = [
            7,
            8, // Ears
            11,
            12, // Shoulders
            15,
            16, // Wrists
            19,
            20, // Pinky fingers
            21,
            22, // Index fingers
        ];

        if (this.lastPoseLandmarks.length === 0) {
            return 0;
        }

        let totalMovement = 0;
        let validPoints = 0;

        keyPoints.forEach((i) => {
            if (
                i < landmarks.length &&
                i < this.lastPoseLandmarks.length &&
                landmarks[i] &&
                this.lastPoseLandmarks[i] &&
                landmarks[i].visibility > 0.5
            ) {
                const dx = landmarks[i].x - this.lastPoseLandmarks[i].x;
                const dy = landmarks[i].y - this.lastPoseLandmarks[i].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                totalMovement += distance;
                validPoints++;
            }
        });

        // If there's significant movement in key points, increment fidgeting count
        const avgMovement = validPoints > 0 ? totalMovement / validPoints : 0;

        /*
        if (avgMovement > 0.02) {
            this.fidgetingCount++;
        }

        // Reset fidgeting count periodically
        if (this.movementHistory.length % 30 === 0) {
            this.fidgetingCount = 0;
        }
        */

        // Return normalized fidgeting score (0-1, higher is more fidgeting)
        //return Math.min(this.fidgetingCount / 30, 1);

        const fidgetingScore = Math.min(avgMovement / 0.05, 1); // 0.05 = max expected movement per frame
        return fidgetingScore;
    }

    private calculateLegBouncingScore(landmarks: any[]): number {
        const leftKnee = landmarks[25];
        const rightKnee = landmarks[26];

        if (
            !leftKnee ||
            !rightKnee ||
            leftKnee.visibility < 0.5 ||
            rightKnee.visibility < 0.5
        ) {
            return 0;
        }

        /*
        const currentTime = Date.now();
        let currentDirection: "up" | "down" | null = null;

        // Check left knee
        if (this.lastKneePositions.left && this.lastKneePositions.right) {
            const leftDy = leftKnee.y - this.lastKneePositions.left.y;
            const rightDy = rightKnee.y - this.lastKneePositions.right.y;

            // Use the knee with the most significant movement
            const primaryDy =
                Math.abs(leftDy) > Math.abs(rightDy) ? leftDy : rightDy;

            if (Math.abs(primaryDy) > 0.01) {
                currentDirection = primaryDy < 0 ? "up" : "down";
            }
        }

        this.lastKneePositions.left = { x: leftKnee.x, y: leftKnee.y };
        this.lastKneePositions.right = { x: rightKnee.x, y: rightKnee.y };

        if (currentDirection) {
            this.legBounceHistory.push({
                timestamp: currentTime,
                direction: currentDirection,
            });
        }

        this.legBounceHistory = this.legBounceHistory.filter(
            (event) => currentTime - event.timestamp < 2000
        );

        let directionChanges = 0;
        for (let i = 1; i < this.legBounceHistory.length; i++) {
            if (
                this.legBounceHistory[i].direction !==
                this.legBounceHistory[i - 1].direction
            ) {
                directionChanges++;
            }
        }

        const bounceCount = Math.floor(directionChanges / 2);
        return Math.min(bounceCount / 2, 1);
        */

        // Calculate movement since last frame
        let leftDy = 0;
        let rightDy = 0;

        if (this.lastKneePositions.left && this.lastKneePositions.right) {
            leftDy = Math.abs(leftKnee.y - this.lastKneePositions.left.y);
            rightDy = Math.abs(rightKnee.y - this.lastKneePositions.right.y);
        }

        // Update last positions
        this.lastKneePositions.left = { x: leftKnee.x, y: leftKnee.y };
        this.lastKneePositions.right = { x: rightKnee.x, y: rightKnee.y };

        // Use the largest knee movement
        const maxMovement = Math.max(leftDy, rightDy);

        // Normalize to 0-1 based on expected max movement per frame
        const fidgetingScore = Math.min(maxMovement / 0.03, 1); // 0.03 is an example max expected knee movement

        return fidgetingScore;
    }
}
