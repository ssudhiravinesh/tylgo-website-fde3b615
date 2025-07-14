
export interface StateData {
  name: string;
  cities: string[];
  pincodeRanges: { start: string; end: string }[];
}

export const INDIAN_STATES: Record<string, StateData> = {
  "Andhra Pradesh": {
    name: "Andhra Pradesh",
    cities: ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Kakinada", "Rajamahendravaram", "Kadapa", "Anantapur", "Kurnool", "Nellore"],
    pincodeRanges: [{ start: "515001", end: "535594" }]
  },
  "Arunachal Pradesh": {
    name: "Arunachal Pradesh", 
    cities: ["Itanagar", "Naharlagun", "Pasighat", "Tezpur", "Bomdila", "Ziro", "Along", "Tezu", "Changlang", "Khonsa"],
    pincodeRanges: [{ start: "790001", end: "792131" }]
  },
  "Assam": {
    name: "Assam",
    cities: ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Bongaigaon", "Karimganj", "Sivasagar"],
    pincodeRanges: [{ start: "781001", end: "788931" }]
  },
  "Bihar": {
    name: "Bihar",
    cities: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif", "Arrah", "Begusarai", "Katihar"],
    pincodeRanges: [{ start: "800001", end: "855117" }]
  },
  "Chhattisgarh": {
    name: "Chhattisgarh",
    cities: ["Raipur", "Bhilai", "Korba", "Bilaspur", "Durg", "Rajnandgaon", "Jagdalpur", "Raigarh", "Ambikapur", "Mahasamund"],
    pincodeRanges: [{ start: "490001", end: "497778" }]
  },
  "Goa": {
    name: "Goa",
    cities: ["Panaji", "Vasco da Gama", "Margao", "Mapusa", "Ponda", "Bicholim", "Curchorem", "Sanquelim", "Cuncolim", "Quepem"],
    pincodeRanges: [{ start: "403001", end: "403806" }]
  },
  "Gujarat": {
    name: "Gujarat",
    cities: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Anand", "Bharuch"],
    pincodeRanges: [{ start: "360001", end: "396590" }]
  },
  "Haryana": {
    name: "Haryana",
    cities: ["Faridabad", "Gurgaon", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula"],
    pincodeRanges: [{ start: "121001", end: "136156" }]
  },
  "Himachal Pradesh": {
    name: "Himachal Pradesh",
    cities: ["Shimla", "Dharamshala", "Solan", "Mandi", "Palampur", "Baddi", "Nahan", "Hamirpur", "Una", "Kullu"],
    pincodeRanges: [{ start: "171001", end: "177601" }]
  },
  "Jharkhand": {
    name: "Jharkhand",
    cities: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Phusro", "Hazaribagh", "Giridih", "Ramgarh", "Medininagar"],
    pincodeRanges: [{ start: "814001", end: "835325" }]
  },
  "Karnataka": {
    name: "Karnataka",
    cities: ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum", "Gulbarga", "Davanagere", "Bellary", "Bijapur", "Shimoga"],
    pincodeRanges: [{ start: "560001", end: "591346" }]
  },
  "Kerala": {
    name: "Kerala",
    cities: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Alappuzha", "Malappuram", "Kannur", "Kasaragod"],
    pincodeRanges: [{ start: "670001", end: "695615" }]
  },
  "Madhya Pradesh": {
    name: "Madhya Pradesh",
    cities: ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa"],
    pincodeRanges: [{ start: "450001", end: "488448" }]
  },
  "Maharashtra": {
    name: "Maharashtra",
    cities: ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur", "Amravati", "Kolhapur", "Sangli"],
    pincodeRanges: [{ start: "400001", end: "445402" }]
  },
  "Manipur": {
    name: "Manipur",
    cities: ["Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Ukhrul", "Senapati", "Tamenglong", "Chandel", "Jiribam", "Kangpokpi"],
    pincodeRanges: [{ start: "795001", end: "795149" }]
  },
  "Meghalaya": {
    name: "Meghalaya",
    cities: ["Shillong", "Tura", "Jowai", "Nongpoh", "Baghmara", "Williamnagar", "Nongstoin", "Mawkyrwat", "Resubelpara", "Ampati"],
    pincodeRanges: [{ start: "793001", end: "794115" }]
  },
  "Mizoram": {
    name: "Mizoram",
    cities: ["Aizawl", "Lunglei", "Saiha", "Champhai", "Kolasib", "Serchhip", "Mamit", "Lawngtlai", "Hnahthial", "Saitual"],
    pincodeRanges: [{ start: "796001", end: "796901" }]
  },
  "Nagaland": {
    name: "Nagaland",
    cities: ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha", "Mon", "Zunheboto", "Phek", "Kiphire", "Longleng"],
    pincodeRanges: [{ start: "797001", end: "798627" }]
  },
  "Odisha": {
    name: "Odisha",
    cities: ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore", "Bhadrak", "Baripada", "Jharsuguda"],
    pincodeRanges: [{ start: "751001", end: "770076" }]
  },
  "Punjab": {
    name: "Punjab",
    cities: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Firozpur", "Batala", "Pathankot", "Moga"],
    pincodeRanges: [{ start: "140001", end: "160104" }]
  },
  "Rajasthan": {
    name: "Rajasthan",
    cities: ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara", "Alwar", "Bharatpur", "Sikar"],
    pincodeRanges: [{ start: "301001", end: "345034" }]
  },
  "Sikkim": {
    name: "Sikkim",
    cities: ["Gangtok", "Namchi", "Gyalshing", "Mangan", "Singtam", "Jorethang", "Nayabazar", "Rangpo", "Rongli", "Pakyong"],
    pincodeRanges: [{ start: "737101", end: "737139" }]
  },
  "Tamil Nadu": {
    name: "Tamil Nadu",
    cities: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Tiruppur", "Vellore", "Erode", "Thoothukkudi"],
    pincodeRanges: [{ start: "600001", end: "643253" }]
  },
  "Telangana": {
    name: "Telangana",
    cities: ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar", "Mahbubnagar", "Nalgonda", "Adilabad", "Suryapet", "Miryalaguda"],
    pincodeRanges: [{ start: "500001", end: "509412" }]
  },
  "Tripura": {
    name: "Tripura",
    cities: ["Agartala", "Dharmanagar", "Udaipur", "Kailashahar", "Belonia", "Khowai", "Teliamura", "Sabroom", "Kumarghat", "Sonamura"],
    pincodeRanges: [{ start: "799001", end: "799290" }]
  },
  "Uttar Pradesh": {
    name: "Uttar Pradesh",
    cities: ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", "Meerut", "Allahabad", "Bareilly", "Aligarh", "Moradabad"],
    pincodeRanges: [{ start: "201001", end: "285223" }]
  },
  "Uttarakhand": {
    name: "Uttarakhand",
    cities: ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Rishikesh", "Kotdwar", "Pithoragarh", "Almora"],
    pincodeRanges: [{ start: "244001", end: "263680" }]
  },
  "West Bengal": {
    name: "West Bengal",
    cities: ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Malda", "Bardhaman", "Barasat", "Kharagpur", "Haldia"],
    pincodeRanges: [{ start: "700001", end: "743711" }]
  },
  "Delhi": {
    name: "Delhi",
    cities: ["New Delhi", "Delhi Cantonment", "Karol Bagh", "Lajpat Nagar", "Rohini", "Dwarka", "Janakpuri", "Saket", "Vasant Kunj", "Connaught Place"],
    pincodeRanges: [{ start: "110001", end: "110097" }]
  }
};

export const getStateByPincode = (pincode: string): string | null => {
  if (!pincode || pincode.length !== 6) return null;
  
  for (const [stateName, stateData] of Object.entries(INDIAN_STATES)) {
    for (const range of stateData.pincodeRanges) {
      if (pincode >= range.start && pincode <= range.end) {
        return stateName;
      }
    }
  }
  return null;
};

export const getAllStates = (): string[] => {
  return Object.keys(INDIAN_STATES).sort();
};

export const getCitiesByState = (state: string): string[] => {
  return INDIAN_STATES[state]?.cities || [];
};
