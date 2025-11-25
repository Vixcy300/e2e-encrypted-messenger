'use client';

import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Download, Upload, FileIcon, CheckCircle, XCircle, Loader } from 'lucide-react';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export function FileTransfer() {
  const { files, p2pConnection } = useStore();

  const handleDownload = (fileItem: any) => {
    if (!fileItem.blob) {
      toast.error('File not available');
      return;
    }

    try {
      downloadBlob(fileItem.blob, fileItem.name);
      toast.success('File downloaded');
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const handleAcceptFile = (fileId: string) => {
    if (!p2pConnection) return;
    p2pConnection.acceptFileTransfer(fileId);
    toast('Receiving file...');
  };

  if (files.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center text-white">
          <FileIcon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50 text-[#2C6BED]" />
          <p className="text-base sm:text-lg font-medium text-white">No files transferred</p>
          <p className="text-xs sm:text-sm opacity-75 text-[#B0B3B8] mt-1">Drag, drop or attach files to share</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3">
      {files.map((file, index) => (
        <motion.div
          key={file.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-[#2C2E33] border border-[#2C6BED]/20 rounded-xl p-3 sm:p-4"
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <div className={`p-2 sm:p-3 rounded-lg border ${
              file.direction === 'sending' ? 'bg-[#2C6BED]/20 border-[#2C6BED]' : 'bg-[#2C6BED]/10 border-[#2C6BED]/50'
            }`}>
              {file.direction === 'sending' ? (
                <Upload className="w-4 h-4 sm:w-6 sm:h-6 text-[#2C6BED]" />
              ) : (
                <Download className="w-4 h-4 sm:w-6 sm:h-6 text-[#2C6BED]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate text-sm sm:text-base">{file.name}</p>
                  <p className="text-xs sm:text-sm text-[#B0B3B8]">
                    {formatFileSize(file.size)} • {file.direction}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {file.status === 'completed' && (
                    <>
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#2C6BED]" />
                      {file.blob && file.direction === 'receiving' && (
                        <Button
                          onClick={() => handleDownload(file)}
                          size="sm"
                          className="bg-[#2C6BED] hover:bg-[#1851B4] text-white border-0 text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8"
                        >
                          <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      )}
                    </>
                  )}
                  {file.status === 'failed' && (
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                  )}
                  {file.status === 'transferring' && (
                    <Loader className="w-4 h-4 sm:w-5 sm:h-5 text-[#2C6BED] animate-spin" />
                  )}
                  {file.status === 'pending' && file.direction === 'receiving' && (
                    <Button
                      onClick={() => handleAcceptFile(file.id)}
                      size="sm"
                      className="bg-[#2C6BED]/20 border border-[#2C6BED] text-[#2C6BED] hover:bg-[#2C6BED]/30 text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8"
                    >
                      Accept
                    </Button>
                  )}
                </div>
              </div>

              {(file.status === 'transferring' || file.status === 'pending') && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-[#B0B3B8] mb-1">
                    <span>{file.status}</span>
                    <span>{Math.round(file.progress)}%</span>
                  </div>
                  <div className="w-full bg-[#1B1C1F] border border-[#2C6BED]/30 rounded-full h-1.5 sm:h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${file.progress}%` }}
                      className="h-full bg-[#2C6BED]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
