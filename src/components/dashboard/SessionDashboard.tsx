
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Smile, Meh, Users, Loader2, User, BookOpen, Clock, History, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import * as tf from '@tensorflow/tfjs';
import { useCamera } from '@/providers/camera-provider';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { SessionInfo, HistoricalData, FaceData } from '@/app/dashboard/types';

const EMOTION_CLASSES = ['ไม่สนใจ', 'สนใจ'];

export default function SessionDashboard({ sessionInfo }: { sessionInfo: SessionInfo }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  
  const faceLandmarkerRef = useRef<FaceLandmarker>();
  const cnnModelRef = useRef<tf.LayersModel>();

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);

  const { toast } = useToast();

  const [realtimeStudentCount, setRealtimeStudentCount] = useState(0);
  const [interestedCount, setInterestedCount] = useState(0);
  
  const minuteFrameCountRef = useRef(0);
  const minuteTotalStudentCountRef = useRef(0);
  const minuteTotalInterestedCountRef = useRef(0);

  const [liveCroppedFaces, setLiveCroppedFaces] = useState<FaceData[]>([]);
  
  const { stream, hasCameraPermission, stopStream } = useCamera();

  useEffect(() => {
    return () => {
      stopStream();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      faceLandmarkerRef.current?.close();
      cnnModelRef.current?.dispose();
    };
  }, [stopStream]);
  
  useEffect(() => {
    const loadModels = async () => {
      console.log("🧠 loadModels started");
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
        );
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU",
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 20,
        });

        await tf.setBackend('webgl');
        cnnModelRef.current = await tf.loadLayersModel('/model/model.json');
        
        console.log("✅ Models loaded successfully");
        setModelsLoaded(true);
      } catch (error) {
        console.error("Failed to load AI models:", error);
        toast({
          variant: 'destructive',
          title: 'ไม่สามารถโหลดโมเดล AI',
          description: 'โปรดตรวจสอบ Console เพื่อดูรายละเอียดและรีเฟรชหน้าเว็บ',
        });
      }
    };
    loadModels();
  }, [toast]);

  const predictWebcam = useCallback(async () => {
    const faceLandmarker = faceLandmarkerRef.current;
    const cnnModel = cnnModelRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!modelsLoaded || !faceLandmarker || !cnnModel || !video || !canvas || video.paused || video.ended || video.readyState < 4) {
      animationFrameId.current = requestAnimationFrame(predictWebcam);
      return;
    }

    const results = faceLandmarker.detectForVideo(video, performance.now());
    const ctx = canvas.getContext('2d');

    if (ctx && results.faceLandmarks) {
        const scaleX = video.clientWidth / video.videoWidth;
        const scaleY = video.clientHeight / video.videoHeight;
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let currentInterested = 0;

        for (const landmarks of results.faceLandmarks) {
            let minX = video.videoWidth, minY = video.videoHeight, maxX = 0, maxY = 0;
            for (const landmark of landmarks) {
                minX = Math.min(minX, landmark.x * video.videoWidth);
                maxX = Math.max(maxX, landmark.x * video.videoWidth);
                minY = Math.min(minY, landmark.y * video.videoHeight);
                maxY = Math.max(maxY, landmark.y * video.videoHeight);
            }
            const padding = 20;
            const x = Math.max(0, minX - padding);
            const y = Math.max(0, minY - padding);
            const width = (maxX - minX) + (padding * 2);
            const height = (maxY - minY) + (padding * 2);

            if (!cnnModelRef.current || cnnModelRef.current.isDisposed) {
                continue;
            }
            
            const isInterested = await tf.tidy(() => {
                const faceImageTensor = tf.browser.fromPixels(video)
                    .slice([Math.round(y), Math.round(x), 0], [Math.round(height), Math.round(width), 3])
                    .resizeBilinear([48, 48])
                    .mean(2)
                    .toFloat()
                    .div(tf.scalar(255.0))
                    .expandDims(0)
                    .expandDims(-1);
                
                const prediction = cnnModelRef.current!.predict(faceImageTensor) as tf.Tensor;
                const interestedScore = prediction.dataSync()[1];
                
                return interestedScore > 0.5;
            });
            
            if (isInterested) currentInterested++;
            
            const color = isInterested ? '#4ade80' : '#f87171';
            const thaiText = isInterested ? EMOTION_CLASSES[1] : EMOTION_CLASSES[0];
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY);
            
            ctx.fillStyle = color;
            const textBackgroundHeight = 24;
            ctx.font = `bold 16px 'Poppins'`;
            const textWidth = ctx.measureText(thaiText).width;
            
            ctx.fillRect(x * scaleX, (y * scaleY) - textBackgroundHeight, textWidth + 12, textBackgroundHeight);
            
            ctx.fillStyle = '#fff';
            ctx.fillText(thaiText, (x * scaleX) + 6, (y * scaleY) - 6);
        }
        
        setRealtimeStudentCount(results.faceLandmarks.length);
        setInterestedCount(currentInterested);
        
        minuteFrameCountRef.current++;
        minuteTotalStudentCountRef.current += results.faceLandmarks.length;
        minuteTotalInterestedCountRef.current += currentInterested;
    }
    
    animationFrameId.current = requestAnimationFrame(predictWebcam);
  }, [modelsLoaded]);

  useEffect(() => {
    const dataCaptureInterval = setInterval(async () => {
      const frameCount = minuteFrameCountRef.current;
      if (frameCount > 0) {
        const avgPersonCount = Math.round(minuteTotalStudentCountRef.current / frameCount);
        const avgInterested = Math.round(minuteTotalInterestedCountRef.current / frameCount);
        const avgUninterested = avgPersonCount - avgInterested;

        minuteFrameCountRef.current = 0;
        minuteTotalStudentCountRef.current = 0;
        minuteTotalInterestedCountRef.current = 0;

        const newDisplayEntry: HistoricalData = {
          timestamp: format(new Date(), 'HH:mm:ss น.'),
          personCount: avgPersonCount,
          interested: avgPersonCount > 0 ? `${Math.round((avgInterested / avgPersonCount) * 100)}%` : '0%',
          uninterested: avgPersonCount > 0 ? `${Math.round((avgUninterested / avgPersonCount) * 100)}%` : '0%',
        };
        
        setHistoricalData(prevData => [newDisplayEntry, ...prevData]);

        try {
            const timelineRef = collection(db, "sessions", sessionInfo.id, "timeline");
            await addDoc(timelineRef, {
                timestamp: serverTimestamp(),
                personCount: avgPersonCount,
                interestedCount: avgInterested,
                uninterestedCount: avgUninterested
            });
        } catch (error) {
            console.error("Failed to save timeline data:", error);
        }
      }
    }, 60000); // Save every 1 minute

    return () => clearInterval(dataCaptureInterval);
  }, [sessionInfo.id]);

  useEffect(() => {
    if (stream && videoRef.current && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Video play failed:", e));
      };
    }
  }, [stream]);

  useEffect(() => {
    if (modelsLoaded && stream) {
        const video = videoRef.current;
        const startPrediction = () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            animationFrameId.current = requestAnimationFrame(predictWebcam);
        };

        if(video){
            video.addEventListener("loadeddata", startPrediction);
        }
        
        return () => {
            if(video){
                video.removeEventListener("loadeddata", startPrediction);
            }
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }
  }, [modelsLoaded, stream, predictWebcam]);


  const uninterestedCount = realtimeStudentCount - interestedCount;
  const interestedPercentage = realtimeStudentCount > 0 ? Math.round((interestedCount / realtimeStudentCount) * 100) : 0;
  const uninterestedPercentage = realtimeStudentCount > 0 ? Math.round((uninterestedCount / realtimeStudentCount) * 100) : 0;

  const handleExport = () => {
    if (historicalData.length === 0) {
      toast({
        variant: 'destructive',
        title: 'ไม่มีข้อมูล',
        description: 'ยังไม่มีข้อมูลย้อนหลังให้ส่งออก',
      });
      return;
    }

    const headers = ['เวลา', 'จำนวนคน (เฉลี่ย)', 'สนใจ (%)', 'ไม่สนใจ (%)'];
    const data = historicalData.map(d => [d.timestamp, d.personCount, d.interested, d.uninterested]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + data.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = `session-report-${sessionInfo.subject}-${sessionInfo.date}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link); 
    link.click();
    document.body.removeChild(link);

    toast({
        title: 'ส่งออกข้อมูลสำเร็จ',
        description: `ไฟล์ ${fileName} ได้ถูกดาวน์โหลดแล้ว`,
    });
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div className="grid gap-1">
            <h1 className="text-3xl font-bold tracking-tight font-headline">แดชบอร์ดการวิเคราะห์</h1>
            <p className="text-muted-foreground">การวิเคราะห์การมีส่วนร่วมในห้องเรียนแบบเรียลไทม์</p>
        </div>
        <Button onClick={handleExport} disabled={historicalData.length === 0}>
            <FileDown className="mr-2 h-4 w-4" />
            ส่งออกเป็น Excel
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>การวิเคราะห์วิดีโอสด</CardTitle>
              <CardDescription>ตรวจจับและวิเคราะห์การมีส่วนร่วมจากวิดีโอแบบเรียลไทม์</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center items-center gap-4">
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted flex justify-center items-center">
                 <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                 <canvas ref={canvasRef} className="absolute top-0 left-0" />
                { !modelsLoaded && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
                      <Loader2 className="h-8 w-8 animate-spin mb-2" />
                      <p>กำลังโหลดโมเดลวิเคราะห์ใบหน้า...</p>
                   </div>
                )}
                 {hasCameraPermission === false && (
                    <Alert variant="destructive" className="w-full max-w-md absolute">
                      <AlertTitle>จำเป็นต้องเข้าถึงกล้อง</AlertTitle>
                      <AlertDescription>
                        โปรดอนุญาตให้เข้าถึงกล้องเพื่อใช้คุณสมบัตินี้
                      </AlertDescription>
                    </Alert>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-6">
            <Card>
              <CardHeader>
                  <CardTitle className="text-sm font-medium">ข้อมูลการสังเกตการณ์</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">ผู้สังเกตการณ์</span>
                          <span className="font-semibold">{sessionInfo.name}</span>
                      </div>
                  </div>
                   <div className="flex items-center gap-4">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                      <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">วิชา</span>
                          <span className="font-semibold">{sessionInfo.subject}</span>
                      </div>
                  </div>
                   <div className="flex items-center gap-4">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">วันที่</span>
                          <span className="font-semibold">{sessionInfo.date}</span>
                      </div>
                  </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">นักเรียนทั้งหมด (เรียลไทม์)</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{realtimeStudentCount}</div>
                <p className="text-xs text-muted-foreground">ที่ตรวจพบในกล้องขณะนี้</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">สนใจ</CardTitle>
                <Smile className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{interestedPercentage}%</div>
                <p className="text-xs text-muted-foreground">{interestedCount} จาก {realtimeStudentCount} คน</p>
              </Content>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ไม่สนใจ</CardTitle>
                <Meh className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{uninterestedPercentage}%</div>
                <p className="text-xs text-muted-foreground">{uninterestedCount} จาก {realtimeStudentCount} คน</p>
              </Content>
            </Card>
        </div>
        
        <div className="lg:col-span-3">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                <CardTitle>ข้อมูลย้อนหลัง (สรุปทุก 1 นาที)</CardTitle>
              </div>
              <CardDescription>ภาพรวมการมีส่วนร่วมสำหรับเซสชันปัจจุบัน</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">เวลา</TableHead>
                    <TableHead className="text-center">จำนวนคน (เฉลี่ย)</TableHead>
                    <TableHead className="text-center text-green-600">สนใจ</TableHead>
                    <TableHead className="text-center text-red-600 pr-6">ไม่สนใจ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicalData.length > 0 ? (
                    historicalData.map((entry, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium pl-6">{entry.timestamp}</TableCell>
                        <TableCell className="text-center">{entry.personCount}</TableCell>
                        <TableCell className="text-center">{entry.interested}</TableCell>
                        <TableCell className="text-center pr-6">{entry.uninterested}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        ยังไม่มีข้อมูล... ข้อมูลจะแสดงที่นี่หลังจากผ่านไป 1 นาที
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
