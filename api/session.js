export default function handler(req, res) {
  return res.status(200).json({ uid: "user-1", name: "Admin" });
}
