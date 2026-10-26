// Wording for customer emails, one set per language. The Vietnamese is a DRAFT to be checked
// by a Vietnamese speaker before launch (owner task), like messages/vi.json.
export type EmailStrings = {
  subject: { booking_confirmation: string; reminder: string; session_moved: string; session_cancelled: string };
  heading: { booking_confirmation: string; reminder: string; session_moved: string; session_cancelled: string };
  you: string;
  plusChildren: string;
  secondParent: string;
  creditFrom: string;
  payOnTheDay: string;
  payHow: string;
  freeTrial: string;
  freeCancel: string;
  cantCancel: string;
  movedFrom: string;
  movedNote: string;
  cancelledReason: string;
  creditBack: string;
  nothingToPay: string;
  seeBookings: string;
  findUs: string;
  openMaps: string;
  messageUs: string;
  footer: string;
};

export const en: EmailStrings = {
  subject: {
    booking_confirmation: "You're booked: {title}, {when}",
    reminder: "See you tomorrow: {title} at {time}",
    session_moved: "Time change: {title} is now {when}",
    session_cancelled: "Cancelled: {title}, {when}",
  },
  heading: {
    booking_confirmation: "you're booked, {name}",
    reminder: "see you tomorrow, {name}",
    session_moved: "your session has moved",
    session_cancelled: "this session is cancelled",
  },
  you: "You",
  plusChildren: " + {names}",
  secondParent: " + a second parent",
  creditFrom: "{n} credit from your {pack}",
  payOnTheDay: "Pay on the day: {amount}",
  payHow: "By QR, transfer or cash at the studio.",
  freeTrial: "Free trial class",
  freeCancel: "Free cancellation until {time} on {day}.",
  cantCancel: "This booking can't be cancelled online. Message us if your plans change.",
  movedFrom: "It was {old}.",
  movedNote: "Your booking has moved with it. If the new time doesn't suit you, cancel it in the app or message us.",
  cancelledReason: "We're sorry: {reason}.",
  creditBack: "Your credit is back in your {pack}.",
  nothingToPay: "There's nothing to pay.",
  seeBookings: "See my bookings",
  findUs: "Find us",
  openMaps: "Open in Google Maps",
  messageUs: "Questions? Message us:",
  footer: "You're getting this email because you booked with {studio}.",
};

export const vi: EmailStrings = {
  subject: {
    booking_confirmation: "Đã đặt chỗ: {title}, {when}",
    reminder: "Hẹn gặp ngày mai: {title} lúc {time}",
    session_moved: "Đổi giờ: {title} chuyển sang {when}",
    session_cancelled: "Đã huỷ: {title}, {when}",
  },
  heading: {
    booking_confirmation: "đã đặt xong, {name}",
    reminder: "hẹn gặp ngày mai, {name}",
    session_moved: "buổi học đã đổi giờ",
    session_cancelled: "buổi này đã bị huỷ",
  },
  you: "Bạn",
  plusChildren: " + {names}",
  secondParent: " + một phụ huynh",
  creditFrom: "{n} buổi từ {pack}",
  payOnTheDay: "Trả tại studio: {amount}",
  payHow: "Bằng QR, chuyển khoản hoặc tiền mặt tại studio.",
  freeTrial: "Buổi học thử miễn phí",
  freeCancel: "Huỷ miễn phí trước {time} ngày {day}.",
  cantCancel: "Không thể huỷ chỗ này trực tuyến. Hãy nhắn cho chúng tôi nếu bạn thay đổi kế hoạch.",
  movedFrom: "Giờ cũ: {old}.",
  movedNote: "Chỗ của bạn đã được chuyển theo. Nếu giờ mới không phù hợp, hãy huỷ trong ứng dụng hoặc nhắn cho chúng tôi.",
  cancelledReason: "Chúng tôi rất tiếc: {reason}.",
  creditBack: "Buổi của bạn đã được hoàn lại vào {pack}.",
  nothingToPay: "Bạn không phải trả gì.",
  seeBookings: "Xem lịch đã đặt",
  findUs: "Địa chỉ",
  openMaps: "Mở Google Maps",
  messageUs: "Có câu hỏi? Nhắn cho chúng tôi:",
  footer: "Bạn nhận được email này vì đã đặt chỗ tại {studio}.",
};

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? `{${k}}`));
}
