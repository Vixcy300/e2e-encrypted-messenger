// Enhanced chat interface with screen sharing and advanced features
export const enhancedChatFeatures = {
  screenShare: true,
  audio: true,
  video: true,
  markdown: true,
  codeHighlight: true,
  reactions: true,
  search: true,
  voiceMessages: true,
};

// Screen sharing handler
export async function startScreenSharing(p2pConnection: any) {
  try {
    const stream = await p2pConnection.startScreenShare();
    return stream;
  } catch (error) {
    throw new Error('Failed to start screen sharing');
  }
}

// Stop screen sharing
export function stopScreenSharing(stream: MediaStream, p2pConnection: any) {
  stream.getTracks().forEach(track => track.stop());
  p2pConnection.stopScreenShare();
}
