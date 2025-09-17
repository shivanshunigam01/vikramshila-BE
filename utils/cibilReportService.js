import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** ================= MONO THEME (BLACK ONLY) ================= */
const C = {
  text: "#000000", // black
  sub: "#333333", // dark gray labels
  lite: "#555555", // mid gray
  border: "#DDDDDD", // light gray lines/boxes
  faint: "#F7F7F7", // very light gray fill for boxes
};

/** ================= HELPERS ================= */
const fmtDate = (yyyymmdd) => {
  if (!yyyymmdd) return "-";
  const s = String(yyyymmdd);
  if (!/^\d{8}$/.test(s)) return s;
  const y = s.slice(0, 4),
    m = s.slice(4, 6),
    d = s.slice(6, 8);
  const M = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][+m - 1];
  return `${d}-${M}-${y}`;
};
const fmtTime = (hhmmss) => {
  if (!hhmmss) return "-";
  const s = String(hhmmss).padStart(6, "0");
  if (!/^\d{6}$/.test(s)) return s;
  return `${s.slice(0, 2)}:${s.slice(2, 4)}:${s.slice(4, 6)}`;
};
const money = (n) => {
  if (n === "" || n === null || n === undefined) return "-";
  const x = Number(n);
  if (Number.isNaN(x)) return String(n);
  return x.toLocaleString("en-IN");
};
const clean = (v, fb = "-") => (v && String(v).trim() !== "" ? v : fb);
const g = (obj, pathArr, def = undefined) => {
  try {
    return (
      pathArr.reduce(
        (o, k) => (o && o[k] !== undefined ? o[k] : undefined),
        obj
      ) ?? def
    );
  } catch {
    return def;
  }
};
const mask = (s, keep = 4) => {
  if (!s) return "-";
  const str = String(s);
  if (str.length <= keep) return "****";
  return `${"*".repeat(Math.max(0, str.length - keep))}${str.slice(-keep)}`;
};

/** ================= NORMALIZER (Surepass → Experian) ================= */
const normalizeExperian = (cibilData, userData) => {
  const full = cibilData?.full || {};
  const cr = full?.credit_report || {};
  const hdr = cr?.CreditProfileHeader || {};
  const curr = cr?.Current_Application?.Current_Application_Details || {};
  const currApplicant = curr?.Current_Applicant_Details || {};
  const currAddr = curr?.Current_Applicant_Address_Details || {};
  const cais = cr?.CAIS_Account || {};
  const caisSummary = cais?.CAIS_Summary || {};
  const creditAccount = caisSummary?.Credit_Account || {};
  const totOutstanding = caisSummary?.Total_Outstanding_Balance || {};
  const accounts = Array.isArray(cais?.CAIS_Account_DETAILS)
    ? cais.CAIS_Account_DETAILS
    : [];

  const score = cibilData?.score ?? full?.credit_score ?? "-";
  return {
    score,
    reportNo: cibilData?.report_number ?? hdr?.ReportNumber ?? "-",
    reportDate: hdr?.ReportDate ? fmtDate(hdr.ReportDate) : "-",
    reportTime: hdr?.ReportTime ? fmtTime(hdr.ReportTime) : "-",
    version: clean(hdr?.Version),

    // candidate / identity
    candidate: {
      name:
        full?.name ||
        [
          currApplicant?.First_Name,
          currApplicant?.Middle_Name1,
          currApplicant?.Last_Name,
        ]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        userData?.name ||
        "-",
      pan: full?.pan || currApplicant?.IncomeTaxPan || userData?.pan || "-",
      dob: fmtDate(currApplicant?.Date_Of_Birth_Applicant),
      gender: clean(currApplicant?.Gender),
      mobile:
        full?.mobile ||
        currApplicant?.MobilePhoneNumber ||
        userData?.phone ||
        "-",
      email: currApplicant?.EMailId || userData?.email || "-",
      voterId: clean(currApplicant?.Voter_ID_Number),
      passport: clean(currApplicant?.Passport_Number),
      drivingLicense: clean(currApplicant?.Driver_License_Number),
      address: {
        line1: clean(currAddr?.FlatNoPlotNoHouseNo),
        line2: clean(currAddr?.BldgNoSocietyName),
        area: clean(currAddr?.RoadNoNameAreaLocality),
        city: clean(currAddr?.City),
        state: clean(currAddr?.State),
        pin: clean(currAddr?.PINCode),
        country: clean(currAddr?.Country_Code),
        residenceCode: clean(currAddr?.Residence_Code),
        residenceSince: fmtDate(currAddr?.Residence_Code_Date),
      },
    },

    // portfolio / summary
    portfolio: {
      accountsTotal: clean(creditAccount?.CreditAccountTotal),
      accountsActive: clean(creditAccount?.CreditAccountActive),
      accountsClosed: clean(creditAccount?.CreditAccountClosed),
      securedOutstanding: money(totOutstanding?.Outstanding_Balance_Secured),
      unsecuredOutstanding: money(
        totOutstanding?.Outstanding_Balance_UnSecured
      ),
      allOutstanding: money(totOutstanding?.Outstanding_Balance_All),
    },

    // detailed accounts
    accounts: accounts.map((a) => ({
      subscriber: clean(a?.Subscriber_Name || a?.Identification_Number),
      accountNumber: clean(a?.Account_Number),
      type: clean(a?.Account_Type),
      portfolioType: clean(a?.Portfolio_Type),
      ownership: clean(a?.Account_Owner), // Individual/Joint/Authorized User
      openDate: fmtDate(a?.Open_Date),
      lastPayment: fmtDate(a?.Date_of_Last_Payment),
      reported: fmtDate(a?.Date_Reported),
      closedDate: fmtDate(a?.Date_Closed),
      sanctionedAmount: money(a?.Sanctioned_Amount),
      creditLimit: money(a?.Credit_Limit_Amount),
      highestCreditOrLoan: money(a?.Highest_Credit_or_Original_Loan_Amount),
      currentBalance: money(a?.Current_Balance),
      amountOverdue: money(a?.Amount_Past_Due),
      emiAmount: money(a?.EMI_Amount),
      roi: clean(a?.Rate_of_Interest),
      tenureMonths: clean(a?.Repayment_Tenure || a?.Terms_Duration),
      paymentFreq: clean(a?.Payment_Frequency || a?.Terms_Frequency),
      cashLimit: money(a?.Cash_Limit),
      status: clean(a?.Account_Status), // e.g. 01, 11, 93 etc.
      writtenOff: clean(a?.Written_Off_and_Settled_Status),
      suitFiled: clean(a?.Suit_Filed_Wilful_Default),
      collateral: clean(a?.Collateral_Type),
      settlementAmt: money(a?.Written_Off_Settlement_Amount),
      currentBalanceAmt: money(a?.Current_Balance),
    })),

    // raw for appendix
    raw: full,
  };
};

/** ================= DRAW PRIMITIVES (MONO) ================= */
const hHeader = (doc) => {
  // Matches your Vehicle Quotation style: bold lines + dealership block (monochrome)
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(C.text)
    .text("Vikramshila Automobiles Pvt Ltd.", 46, 26, { align: "left" });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(C.text)
    .text("Authorized Dealer - Tata Commercial Vehicles", 46, 44);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(C.text)
    .text(
      "Address: Bhagalpur, Banka & Khagaria | Contact: +91-8406991610",
      46,
      60
    );
  doc.moveTo(46, 76).lineTo(566, 76).lineWidth(1).strokeColor(C.text).stroke(); // thick black rule
  doc
    .moveTo(46, 78)
    .lineTo(566, 78)
    .lineWidth(0.5)
    .strokeColor(C.border)
    .stroke(); // light rule
};

const h2 = (doc, text) => {
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(C.text).text(text);
  const x = doc.x,
    y = doc.y + 2;
  doc.moveTo(x, y).lineTo(566, y).lineWidth(0.5).strokeColor(C.border).stroke();
  doc.moveDown(0.4);
};

const label = (doc, text, x, y) => {
  doc.font("Helvetica").fontSize(9).fillColor(C.sub).text(text, x, y);
};
const value = (doc, text, x, y, w = 190, align = "left") => {
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(C.text)
    .text(text, x, y, { width: w, align });
};

const divider = (doc, y) => {
  doc
    .moveTo(46, y)
    .lineTo(566, y)
    .lineWidth(0.5)
    .strokeColor(C.border)
    .stroke();
};

/** ================= MAIN ================= */
export function generateCibilReport(cibilData, userData) {
  return new Promise((resolve, reject) => {
    const outDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outputPath = path.join(outDir, "cibil-report.pdf");

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 88, left: 46, right: 46, bottom: 56 },
      info: {
        Title: "CIBIL Credit Report",
        Author: "Vikramshila Automobiles Pvt Ltd.",
      },
    });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const N = normalizeExperian(cibilData, userData);

    /* ===== Header (mono, like your quotation) ===== */
    hHeader(doc);

    /* ===== Document Title Row ===== */
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(C.text)
      .text("CIBIL CREDIT REPORT", 46, 92);
    doc.moveDown(0.2);
    divider(doc, doc.y + 2);

    /* ===== Report Meta (left) ===== */
    let y = doc.y + 10;
    label(doc, "Report Number", 46, y);
    value(doc, String(N.reportNo), 150, y);
    y += 16;
    label(doc, "Report Date", 46, y);
    value(doc, N.reportDate, 150, y);
    y += 16;
    label(doc, "Report Time", 46, y);
    value(doc, N.reportTime, 150, y);
    y += 16;
    if (N.version && N.version !== "-") {
      label(doc, "Version", 46, y);
      value(doc, N.version, 150, y);
      y += 16;
    }

    /* ===== Candidate Snapshot (right) ===== */
    let ry = doc.y - 64;
    label(doc, "CIBIL Score", 360, ry);
    value(doc, String(N.score ?? "—"), 450, ry);
    ry += 16;
    label(doc, "Name", 360, ry);
    value(doc, N.candidate.name, 450, ry);
    ry += 16;
    label(doc, "PAN", 360, ry);
    value(doc, N.candidate.pan, 450, ry);
    ry += 16;
    label(doc, "Mobile", 360, ry);
    value(doc, N.candidate.mobile, 450, ry);
    ry += 16;
    label(doc, "Email", 360, ry);
    value(doc, N.candidate.email, 450, ry);

    /* ===== Customer Details ===== */
    h2(doc, "Customer Details");
    y = doc.y + 2;
    label(doc, "Date of Birth", 46, y);
    value(doc, N.candidate.dob, 150, y);
    y += 16;
    label(doc, "Gender", 46, y);
    value(doc, N.candidate.gender, 150, y);
    y += 16;
    label(doc, "Voter ID", 46, y);
    value(doc, N.candidate.voterId, 150, y);
    y += 16;
    label(doc, "Passport", 46, y);
    value(doc, N.candidate.passport, 150, y);
    y += 16;
    label(doc, "Driving License", 46, y);
    value(doc, N.candidate.drivingLicense, 150, y);

    // Address block (right column)
    const aTop = doc.y - 64;
    label(doc, "Address", 360, aTop);
    const addr1 =
      [
        N.candidate.address.line1,
        N.candidate.address.line2,
        N.candidate.address.area,
      ]
        .filter((s) => s && s !== "-")
        .join(", ") || "-";
    const addr2 =
      [
        N.candidate.address.city,
        N.candidate.address.state,
        N.candidate.address.pin,
        N.candidate.address.country,
      ]
        .filter((s) => s && s !== "-")
        .join(", ") || "-";
    value(doc, addr1, 420, aTop, 140);
    value(doc, addr2, 420, aTop + 16, 140);
    label(doc, "Residence Code", 360, aTop + 36);
    value(doc, N.candidate.address.residenceCode, 450, aTop + 36);
    label(doc, "Residence Since", 360, aTop + 52);
    value(doc, N.candidate.address.residenceSince, 450, aTop + 52);

    /* ===== Portfolio Summary (boxed mono) ===== */
    h2(doc, "Portfolio Summary");
    const boxY = doc.y;
    doc.roundedRect(46, boxY, 520, 80, 6).fillAndStroke("#FFFFFF", C.border);
    const cells = [
      ["Accounts (Total)", N.portfolio.accountsTotal],
      ["Active", N.portfolio.accountsActive],
      ["Closed", N.portfolio.accountsClosed],
      ["Outstanding - Secured", N.portfolio.securedOutstanding],
      ["Outstanding - Unsecured", N.portfolio.unsecuredOutstanding],
      ["Outstanding - All", N.portfolio.allOutstanding],
    ];
    let cx = 62,
      cy = boxY + 12;
    cells.forEach((c, i) => {
      label(doc, c[0], cx, cy);
      value(doc, String(c[1] ?? "-"), cx, cy + 12);
      cx += 180;
      if ((i + 1) % 3 === 0) {
        cx = 62;
        cy += 36;
      }
    });
    doc.moveDown(1.2);

    /* ===== Accounts (complete mapping, last reported first) ===== */
    h2(doc, "Accounts (last reported first)");
    const startY = doc.y + 4;
    const col = {
      sub: 46,
      type: 195,
      own: 250,
      open: 305,
      limit: 360,
      bal: 430,
      overdue: 490,
    };
    // header
    doc.font("Helvetica-Bold").fontSize(9).fillColor(C.text);
    doc.text("Subscriber / Account", col.sub, startY);
    doc.text("Type", col.type, startY);
    doc.text("Own.", col.own, startY);
    doc.text("Open", col.open, startY);
    doc.text("Limit/Loan", col.limit, startY, { width: 60, align: "right" });
    doc.text("Balance", col.bal, startY, { width: 50, align: "right" });
    doc.text("Overdue", col.overdue, startY, { width: 56, align: "right" });
    divider(doc, startY + 12);

    let rowY = startY + 16;
    const rows = (N.accounts || []).sort((a, b) =>
      (b.reported || "").localeCompare(a.reported || "")
    );
    rows.forEach((r, idx) => {
      // row content (monochrome)
      doc.font("Helvetica").fontSize(9).fillColor(C.text);
      const sub =
        r.subscriber && r.subscriber !== "-" ? r.subscriber : r.accountNumber;
      doc.text(sub ? mask(sub, 6) : "-", col.sub, rowY, { width: 140 });
      doc.text(r.type || "-", col.type, rowY, { width: 50 });
      doc.text(r.ownership || "-", col.own, rowY, { width: 44 });
      doc.text(r.openDate || "-", col.open, rowY, { width: 50 });
      doc.text(
        r.highestCreditOrLoan ||
          r.creditLimit ||
          r.sanctionedAmount ||
          r.limitOrLoan ||
          "-",
        col.limit,
        rowY,
        { width: 60, align: "right" }
      );
      doc.text(r.currentBalance || "-", col.bal, rowY, {
        width: 50,
        align: "right",
      });
      doc.text(r.amountOverdue || "-", col.overdue, rowY, {
        width: 56,
        align: "right",
      });

      rowY += 14;

      // subline: detailed mono row
      const subline = [
        r.reported && r.reported !== "-" ? `Reported ${r.reported}` : null,
        r.lastPayment && r.lastPayment !== "-"
          ? `Last Pay ${r.lastPayment}`
          : null,
        r.closedDate && r.closedDate !== "-" ? `Closed ${r.closedDate}` : null,
        r.status && r.status !== "-" ? `Status ${r.status}` : null,
        r.roi && r.roi !== "-" ? `ROI ${r.roi}%` : null,
        r.tenureMonths && r.tenureMonths !== "-"
          ? `Tenure ${r.tenureMonths}m`
          : null,
        r.paymentFreq && r.paymentFreq !== "-" ? `Freq ${r.paymentFreq}` : null,
        r.suitFiled && r.suitFiled !== "-" ? `Suit/WD ${r.suitFiled}` : null,
        r.writtenOff && r.writtenOff !== "-"
          ? `WO/Settle ${r.writtenOff}`
          : null,
        r.collateral && r.collateral !== "-"
          ? `Collateral ${r.collateral}`
          : null,
      ]
        .filter(Boolean)
        .join("  •  ");
      if (subline) {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(C.lite)
          .text(subline, col.sub, rowY, { width: 520 - (col.sub - 46) });
        rowY += 12;
      }

      // page break check
      if (rowY > doc.page.height - doc.page.margins.bottom - 80) {
        doc.addPage();
        hHeader(doc);
        h2(doc, "Accounts (contd.)");
        rowY = doc.y + 6;
      }
    });

    /* ===== Appendix: Raw JSON (truncated for safety) ===== */
    doc.addPage();
    hHeader(doc);
    h2(doc, "Appendix — Raw Report JSON (truncated)");
    try {
      const jsonString = JSON.stringify(N.raw ?? {}, null, 2);
      const lines = jsonString.split("\n").slice(0, 400); // keep to 400 lines
      doc.font("Helvetica").fontSize(8).fillColor(C.lite);
      lines.forEach((ln) => doc.text(ln, { width: 500 }));
      if (jsonString.split("\n").length > 400) {
        doc
          .moveDown(0.5)
          .font("Helvetica")
          .fontSize(9)
          .fillColor(C.sub)
          .text("…truncated…");
      }
    } catch {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(C.sub)
        .text("No raw JSON available.");
    }

    /* ===== Footer (mono) ===== */
    const addFooter = () => {
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const s = `© ${new Date().getFullYear()} Vikramshila Automobiles Pvt Ltd.  •  Page ${
          i + 1
        } of ${range.count}`;
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(C.lite)
          .text(s, 46, doc.page.height - 36, { align: "center", width: 520 });
      }
    };
    doc.on("end", addFooter);

    doc.end();
    stream.on("finish", () => resolve(outputPath));
    stream.on("error", (err) => reject(err));
  });
}
