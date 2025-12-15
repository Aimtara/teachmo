export default async (req, res) => {
  const event = req.body || {};
  console.log('Received event', event);
  res.status(200).json({ received: true, event });
};
