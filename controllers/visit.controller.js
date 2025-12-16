import Visit from "../models/visit.model.js";

export const trackVisit = async (req, res) => {
  try {
    const { page } = req.body;
    const { ip, userAgent, referrer } = req.clientInfo;

    // 🕒 Start of today (00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 🔍 Check if this user (IP + UA) already visited today
    const existingVisit = await Visit.findOne({
      ip,
      userAgent,
      createdAt: { $gte: today },
    });

    // 🚫 If already visited today, do NOT count again
    if (existingVisit) {
      return res.json({
        success: true,
        counted: false,
        message: "Visit already counted for today",
      });
    }

    // ✅ First visit of the day → count it
    await Visit.create({
      ip,
      page,
      referrer,
      userAgent,
      isUnique: true,
    });

    return res.json({
      success: true,
      counted: true,
    });
  } catch (err) {
    console.error("Track visit error:", err);
    return res.status(500).json({ success: false });
  }
};
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalVisits, todayVisits, uniqueVisitors, topPages] =
      await Promise.all([
        Visit.countDocuments(),
        Visit.countDocuments({ createdAt: { $gte: today } }),
        Visit.distinct("ip"),
        Visit.aggregate([
          { $group: { _id: "$page", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),
      ]);

    res.json({
      totalVisits,
      todayVisits,
      uniqueVisitors: uniqueVisitors.length,
      topPages,
    });
  } catch (err) {
    res.status(500).json({ error: "Analytics error" });
  }
};
