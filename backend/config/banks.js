/**
 * config/banks.js — Server-side mirror of frontend/src/config/banks.js
 *
 * Kept as the source of truth for backend validation so a tampered or
 * buggy client can never persist an invalid bank account or UPI ID.
 */
"use strict";

const BANKS = [
  // Public Sector Banks
  { code: "SBI",      name: "State Bank of India (SBI)",      category: "public", minLen: 11, maxLen: 17, ifscPrefix: "SBIN" },
  { code: "BOB",       name: "Bank of Baroda",                  category: "public", minLen: 10, maxLen: 17, ifscPrefix: "BARB" },
  { code: "PNB",       name: "Punjab National Bank (PNB)",      category: "public", minLen: 10, maxLen: 16, ifscPrefix: "PUNB" },
  { code: "CANARA",    name: "Canara Bank",                     category: "public", minLen: 9,  maxLen: 16, ifscPrefix: "CNRB" },
  { code: "UNION",     name: "Union Bank of India",              category: "public", minLen: 11, maxLen: 15, ifscPrefix: "UBIN" },
  { code: "BOI",       name: "Bank of India",                    category: "public", minLen: 11, maxLen: 15, ifscPrefix: "BKID" },
  { code: "INDIAN",    name: "Indian Bank",                      category: "public", minLen: 6,  maxLen: 15, ifscPrefix: "IDIB" },
  { code: "CENTRAL",   name: "Central Bank of India",            category: "public", minLen: 10, maxLen: 16, ifscPrefix: "CBIN" },
  { code: "IOB",       name: "Indian Overseas Bank",             category: "public", minLen: 9,  maxLen: 16, ifscPrefix: "IOBA" },
  { code: "UCO",       name: "UCO Bank",                         category: "public", minLen: 10, maxLen: 15, ifscPrefix: "UCBA" },
  { code: "MAHA",      name: "Bank of Maharashtra",              category: "public", minLen: 10, maxLen: 16, ifscPrefix: "MAHB" },
  { code: "PSB",       name: "Punjab & Sind Bank",                category: "public", minLen: 10, maxLen: 16, ifscPrefix: "PSIB" },

  // Private Sector Banks
  { code: "HDFC",      name: "HDFC Bank",                        category: "private", minLen: 13, maxLen: 14, ifscPrefix: "HDFC" },
  { code: "ICICI",     name: "ICICI Bank",                       category: "private", minLen: 11, maxLen: 14, ifscPrefix: "ICIC" },
  { code: "AXIS",      name: "Axis Bank",                        category: "private", minLen: 11, maxLen: 18, ifscPrefix: "UTIB" },
  { code: "KOTAK",     name: "Kotak Mahindra Bank",               category: "private", minLen: 10, maxLen: 16, ifscPrefix: "KKBK" },
  { code: "INDUSIND",  name: "IndusInd Bank",                     category: "private", minLen: 10, maxLen: 15, ifscPrefix: "INDB" },
  { code: "YES",       name: "YES Bank",                          category: "private", minLen: 9,  maxLen: 18, ifscPrefix: "YESB" },
  { code: "IDBI",      name: "IDBI Bank",                          category: "private", minLen: 11, maxLen: 18, ifscPrefix: "IBKL" },
  { code: "FEDERAL",   name: "Federal Bank",                      category: "private", minLen: 10, maxLen: 14, ifscPrefix: "FDRL" },
  { code: "SIB",       name: "South Indian Bank",                 category: "private", minLen: 10, maxLen: 16, ifscPrefix: "SIBL" },
  { code: "RBL",       name: "RBL Bank",                          category: "private", minLen: 10, maxLen: 16, ifscPrefix: "RATN" },
  { code: "KVB",       name: "Karur Vysya Bank (KVB)",            category: "private", minLen: 10, maxLen: 16, ifscPrefix: "KVBL" },
  { code: "CUB",       name: "City Union Bank (CUB)",             category: "private", minLen: 10, maxLen: 15, ifscPrefix: "CIUB" },
  { code: "TMB",       name: "Tamilnad Mercantile Bank (TMB)",    category: "private", minLen: 9,  maxLen: 15, ifscPrefix: "TMBL" },
  { code: "DHANLAXMI", name: "Dhanlaxmi Bank",                    category: "private", minLen: 9,  maxLen: 16, ifscPrefix: "DLXB" },
  { code: "KARNATAKA", name: "Karnataka Bank",                    category: "private", minLen: 10, maxLen: 15, ifscPrefix: "KARB" },
  { code: "DCB",       name: "DCB Bank",                          category: "private", minLen: 10, maxLen: 16, ifscPrefix: "DCBL" },
  { code: "BANDHAN",   name: "Bandhan Bank",                       category: "private", minLen: 10, maxLen: 16, ifscPrefix: "BDBL" },
  { code: "CSB",       name: "CSB Bank",                           category: "private", minLen: 10, maxLen: 16, ifscPrefix: "CSBK" },
  { code: "JK",        name: "Jammu & Kashmir Bank",               category: "private", minLen: 9,  maxLen: 16, ifscPrefix: "JAKA" },
  { code: "NAINITAL",  name: "Nainital Bank",                      category: "private", minLen: 9,  maxLen: 15, ifscPrefix: "NTBL" },
  { code: "IDFCFIRST", name: "IDFC FIRST Bank",                    category: "private", minLen: 10, maxLen: 14, ifscPrefix: "IDFB" },

  // Small Finance Banks
  { code: "AU",        name: "AU Small Finance Bank",            category: "sfb", minLen: 10, maxLen: 16, ifscPrefix: "AUBL" },
  { code: "EQUITAS",   name: "Equitas Small Finance Bank",       category: "sfb", minLen: 10, maxLen: 16, ifscPrefix: "ESFB" },
  { code: "UJJIVAN",   name: "Ujjivan Small Finance Bank",       category: "sfb", minLen: 10, maxLen: 16, ifscPrefix: "UJVN" },
  { code: "ESAF",      name: "ESAF Small Finance Bank",          category: "sfb", minLen: 10, maxLen: 16, ifscPrefix: "ESMF" },
  { code: "SURYODAY",  name: "Suryoday Small Finance Bank",      category: "sfb", minLen: 10, maxLen: 16, ifscPrefix: "SURY" },
  { code: "JANA",      name: "Jana Small Finance Bank",          category: "sfb", minLen: 10, maxLen: 16, ifscPrefix: "JSFB" },
  { code: "CAPITAL",   name: "Capital Small Finance Bank",       category: "sfb", minLen: 10, maxLen: 16, ifscPrefix: "CLBL" },
  { code: "NESFB",     name: "North East Small Finance Bank",    category: "sfb", minLen: 10, maxLen: 16, ifscPrefix: "NESF" },
  { code: "SHIVALIK",  name: "Shivalik Small Finance Bank",      category: "sfb", minLen: 10, maxLen: 16, ifscPrefix: "SHIV" },
  { code: "UNITY",     name: "Unity Small Finance Bank",         category: "sfb", minLen: 10, maxLen: 16, ifscPrefix: "UNSF" },
  { code: "UTKARSH",   name: "Utkarsh Small Finance Bank",       category: "sfb", minLen: 10, maxLen: 16, ifscPrefix: "UTKS" },

  // Payments Banks
  { code: "IPPB",      name: "India Post Payments Bank (IPPB)",  category: "payments", minLen: 9,  maxLen: 16, ifscPrefix: "IPOS" },
  { code: "AIRTEL",    name: "Airtel Payments Bank",              category: "payments", minLen: 10, maxLen: 16, ifscPrefix: "AIRP" },
  { code: "FINO",      name: "Fino Payments Bank",                category: "payments", minLen: 10, maxLen: 16, ifscPrefix: "FINO" },
  { code: "NSDL",      name: "NSDL Payments Bank",                category: "payments", minLen: 10, maxLen: 16, ifscPrefix: "NSPB" },
  { code: "JIO",       name: "Jio Payments Bank",                 category: "payments", minLen: 10, maxLen: 16, ifscPrefix: "JIOP" },

  // Foreign Banks
  { code: "SCB",       name: "Standard Chartered Bank",           category: "foreign", minLen: 9,  maxLen: 16, ifscPrefix: "SCBL" },
  { code: "HSBC",      name: "HSBC Bank",                         category: "foreign", minLen: 9,  maxLen: 16, ifscPrefix: "HSBC" },
  { code: "CITI",      name: "Citibank",                          category: "foreign", minLen: 9,  maxLen: 16, ifscPrefix: "CITI" },
  { code: "DBS",       name: "DBS Bank India",                    category: "foreign", minLen: 9,  maxLen: 16, ifscPrefix: "DBSS" },
  { code: "DEUTSCHE",  name: "Deutsche Bank",                     category: "foreign", minLen: 9,  maxLen: 16, ifscPrefix: "DEUT" },

  { code: "OTHER", name: "Other Bank (not listed)", category: "other", minLen: 6, maxLen: 18, ifscPrefix: "" },
];

function getBankByCode(code) {
  return BANKS.find(b => b.code === code) || null;
}

function validateAccountNumber(bankCode, accountNumber) {
  const digits = String(accountNumber || "").replace(/\D/g, "");
  if (!digits) return "Account number is required";
  if (!/^\d+$/.test(digits)) return "Account number must contain digits only";

  const bank = getBankByCode(bankCode);
  const min = bank?.minLen ?? 6;
  const max = bank?.maxLen ?? 18;

  if (digits.length < min) return `${bank ? bank.name : "This bank"} requires at least ${min} digits`;
  if (digits.length > max) return `${bank ? bank.name : "This bank"} allows at most ${max} digits`;
  return "";
}

function validateIfsc(ifsc) {
  const v = String(ifsc || "").trim().toUpperCase();
  if (!v) return "IFSC code is required";
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v)) return "Enter a valid 11-character IFSC code";
  return "";
}

function validateAccountHolderName(name) {
  const v = String(name || "").trim();
  if (!v) return "Account holder name is required";
  if (v.length < 3) return "Name must be at least 3 characters";
  if (!/^[a-zA-Z .']+$/.test(v)) return "Name can only contain letters, spaces, dots and apostrophes";
  return "";
}

/** Validates a full bank-account payload. Returns "" if valid, else an error message. */
function validateBankAccount({ bankCode, bankName, accountHolderName, accountNumber, ifscCode }) {
  if (!bankCode && !bankName) return "Please select a bank";
  const nameErr = validateAccountHolderName(accountHolderName);
  if (nameErr) return nameErr;
  const acctErr = validateAccountNumber(bankCode || "OTHER", accountNumber);
  if (acctErr) return acctErr;
  const ifscErr = validateIfsc(ifscCode);
  if (ifscErr) return ifscErr;
  return "";
}

/** Validate a UPI ID, e.g. "name@upi", "9876543210@okhdfcbank" */
function validateUpiId(upiId) {
  const v = String(upiId || "").trim();
  if (!v) return "UPI ID is required";
  if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-]{1,64}$/.test(v)) {
    return "Enter a valid UPI ID (e.g. name@upi, 9876543210@okhdfcbank)";
  }
  return "";
}

module.exports = {
  BANKS,
  getBankByCode,
  validateAccountNumber,
  validateIfsc,
  validateAccountHolderName,
  validateBankAccount,
  validateUpiId,
};
