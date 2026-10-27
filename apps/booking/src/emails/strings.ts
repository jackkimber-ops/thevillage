// Wording for customer emails, one set per language. The Vietnamese is a DRAFT to be checked
// by a Vietnamese speaker before launch (owner task), like messages/vi.json.
export type EmailStrings = {
  subject: { booking_confirmation: string; reminder: string; session_moved: string; session_cancelled: string; booking_cancelled: string; welcome: string };
  heading: { booking_confirmation: string; reminder: string; session_moved: string; session_cancelled: string; booking_cancelled: string; welcome: string };
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
  lateCreditUsed: string;
  nothingToPay: string;
  welcomeIntro: string;
  welcomeHow: string;
  openBooking: string;
  seeBookings: string;
  findUs: string;
  openMaps: string;
  messageUs: string;
  footer: string;
  footerAdded: string;
};

export const en: EmailStrings = {
  subject: {
    booking_confirmation: "You're booked: {title}, {when}",
    reminder: "See you tomorrow: {title} at {time}",
    session_moved: "Time change: {title} is now {when}",
    session_cancelled: "Cancelled: {title}, {when}",
    booking_cancelled: "Booking cancelled: {title}, {when}",
    welcome: "Welcome to {studio}",
  },
  heading: {
    booking_confirmation: "you're booked, {name}",
    reminder: "see you tomorrow, {name}",
    session_moved: "your session has moved",
    session_cancelled: "this session is cancelled",
    booking_cancelled: "your booking is cancelled",
    welcome: "welcome, {name}",
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
  lateCreditUsed: "This was after the free cancellation time, so the credit is used.",
  nothingToPay: "There's nothing to pay.",
  welcomeIntro: "We've added you to the {studio} booking site.",
  welcomeHow: "Log in with this email to book classes, see your bookings and check your pack. There's no password: we send you a 6-digit code.",
  openBooking: "Open the booking site",
  seeBookings: "See my bookings",
  findUs: "Find us",
  openMaps: "Open in Google Maps",
  messageUs: "Questions? Message us:",
  footer: "You're getting this email because you booked with {studio}.",
  footerAdded: "You're getting this email because {studio} added you to its booking site.",
};

export const vi: EmailStrings = {
  subject: {
    booking_confirmation: "Đã đặt chỗ: {title}, {when}",
    reminder: "Hẹn gặp ngày mai: {title} lúc {time}",
    session_moved: "Đổi giờ: {title} chuyển sang {when}",
    session_cancelled: "Đã huỷ: {title}, {when}",
    booking_cancelled: "Đã huỷ chỗ: {title}, {when}",
    welcome: "Chào mừng đến với {studio}",
  },
  heading: {
    booking_confirmation: "đã đặt xong, {name}",
    reminder: "hẹn gặp ngày mai, {name}",
    session_moved: "buổi học đã đổi giờ",
    session_cancelled: "buổi này đã bị huỷ",
    booking_cancelled: "chỗ của bạn đã được huỷ",
    welcome: "chào mừng, {name}",
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
  lateCreditUsed: "Bạn huỷ sau thời hạn huỷ miễn phí nên buổi này được tính vào gói.",
  nothingToPay: "Bạn không phải trả gì.",
  welcomeIntro: "Chúng tôi đã thêm bạn vào trang đặt chỗ của {studio}.",
  welcomeHow: "Đăng nhập bằng email này để đặt lớp, xem lịch đã đặt và số buổi còn lại. Không cần mật khẩu: chúng tôi gửi cho bạn mã 6 số.",
  openBooking: "Mở trang đặt chỗ",
  seeBookings: "Xem lịch đã đặt",
  findUs: "Địa chỉ",
  openMaps: "Mở Google Maps",
  messageUs: "Có câu hỏi? Nhắn cho chúng tôi:",
  footer: "Bạn nhận được email này vì đã đặt chỗ tại {studio}.",
  footerAdded: "Bạn nhận được email này vì {studio} đã thêm bạn vào trang đặt chỗ.",
};

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? `{${k}}`));
}
