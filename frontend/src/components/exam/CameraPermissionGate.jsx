import { useState } from 'react';
import { Camera, CameraOff, MonitorOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useExamSessionStore from '@/store/examSessionStore';

// States: 'request' → 'confirming' → 'granted' | 'denied' | 'no-device'

export function CameraPermissionGate({ children }) {
  const [stage, setStage] = useState('request');
  const setMediaStream = useExamSessionStore((s) => s.setMediaStream);

  const handleAllow = async () => {
    setStage('confirming');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setMediaStream(stream);
      setStage('granted');
    } catch (err) {
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setStage('no-device');
      } else {
        // NotAllowedError, SecurityError, etc.
        setStage('denied');
      }
    }
  };

  if (stage === 'granted') return children;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm text-center">
        {stage === 'request' && (
          <>
            <CardHeader className="pb-3">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Camera className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-lg">Camera Access Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This exam uses camera monitoring to ensure integrity. Your camera will be
                active throughout the session.
              </p>
              <Button className="w-full" onClick={handleAllow}>
                <Camera className="mr-2 h-4 w-4" />
                Allow Camera
              </Button>
            </CardContent>
          </>
        )}

        {stage === 'confirming' && (
          <>
            <CardHeader className="pb-3">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Camera className="h-7 w-7 text-primary animate-pulse" />
              </div>
              <CardTitle className="text-lg">Requesting Camera…</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Please click &ldquo;Allow&rdquo; in the browser permission prompt.
              </p>
            </CardContent>
          </>
        )}

        {stage === 'denied' && (
          <>
            <CardHeader className="pb-3">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <CameraOff className="h-7 w-7 text-destructive" />
              </div>
              <CardTitle className="text-lg">Camera Access Denied</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Camera permission was denied. Please allow camera access in your browser
                settings and reload this page to continue.
              </p>
              <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </CardContent>
          </>
        )}

        {stage === 'no-device' && (
          <>
            <CardHeader className="pb-3">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <MonitorOff className="h-7 w-7 text-destructive" />
              </div>
              <CardTitle className="text-lg">No Camera Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No camera was detected on this device. Please connect a webcam and reload,
                or contact your administrator.
              </p>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
