export const ok = (res, data = {}, message = "OK") =>
  res.json({ success: true, message, data });

export const created = (res, data = {}, message = "Created") =>
  res.status(201).json({ success: true, message, data });

export const bad = (res, message = "Invalid Email or Password", code = 401) =>
  res.status(code).json({ success: false, message });

export const error = (res, err, code = 500) =>
  res
    .status(code)
    .json({ success: false, message: err?.message || "Server Error" });
