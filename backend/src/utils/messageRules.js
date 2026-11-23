function rejectsNewBuyerEnquiry({ listing, senderIsSeller, existingMessageCount }) {
  return !senderIsSeller
    && existingMessageCount === 0
    && (!listing.is_active || listing.availability_status !== 'available');
}

module.exports = { rejectsNewBuyerEnquiry };
