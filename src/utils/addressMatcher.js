// utils/addressMatcher.js
export const normalizeAddress = (address) => {
  return {
    houseNumber: address.houseNumber?.toUpperCase().trim(),
    roadNumber: address.roadNumber?.toUpperCase().trim(),
    block: address.block?.toUpperCase().trim(),
    areaName: address.areaName?.toLowerCase().trim(),
    upazila: address.upazila,
    district: address.district,
    division: address.division,
  };
};

export const isSameAddress = (addr1, addr2) => {
  const normalized1 = normalizeAddress(addr1);
  const normalized2 = normalizeAddress(addr2);

  return (
    normalized1.houseNumber === normalized2.houseNumber &&
    normalized1.roadNumber === normalized2.roadNumber &&
    normalized1.areaName === normalized2.areaName &&
    normalized1.upazila === normalized2.upazila &&
    normalized1.district === normalized2.district
  );
};
