export default function handler(req, res) {
  res.writeHead(303, { Location: '/?shared=network' });
  res.end();
}
