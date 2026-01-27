export const sendMessageStatusUpdate = (
  ws: WebSocket | null,
  messageId: string,
  status: 'delivered' | 'read'
) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: 'status_update', payload: { messageId, status } }));
};
