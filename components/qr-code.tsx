'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { motion } from 'framer-motion';
import { Download, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
}

export function QRCodeGenerator({ value, size = 200 }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: size,
          margin: 2,
          color: {
            dark: '#00ff41',
            light: '#000000',
          },
        },
        (error) => {
          if (error) {
            console.error('QR Code generation error:', error);
            toast.error('Failed to generate QR code');
          }
        }
      );
    }
  }, [value, size]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Room code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const handleDownloadQR = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `room-${value}.png`;
      link.href = url;
      link.click();
      toast.success('QR code downloaded!');
    }
  };

  if (!value) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-3"
    >
      <div className="flex justify-center p-4 bg-black border border-green-500 rounded-lg shadow-[0_0_30px_rgba(0,255,65,0.3)]">
        <canvas ref={canvasRef} />
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={handleCopyCode}
          variant="outline"
          size="sm"
          className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 font-mono"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              [COPIED]
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1" />
              [COPY]
            </>
          )}
        </Button>
        <Button
          onClick={handleDownloadQR}
          variant="outline"
          size="sm"
          className="border-green-500 text-green-400 hover:bg-green-500/20 font-mono"
        >
          <Download className="w-4 h-4 mr-1" />
          [DOWNLOAD]
        </Button>
      </div>
    </motion.div>
  );
}
