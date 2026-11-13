// Booking and cancellation terms, and the privacy policy (owners, 13 Nov; change #45). English and Vietnamese.
// Times, prices, packs and contact details come from the studio settings and the pack catalog, so the pages
// can't drift from how the app actually behaves. Agreed by Jack for the owners, 13 Nov:
//   unpaid no-show: nothing to pay · moved session: free cancel even after the cut-off · packs: no refund or
//   transfer · private hire: free cancel up to 24 h before · keep details 2 years after the last visit, reply to
//   data requests within 7 days · no marketing emails · business named "The Village" until it's registered.
// The Vietnamese is a draft for a native speaker to check. Not legal advice: see PROGRESS.md for the legal checks.
import type { ReactNode } from "react";
import type { PackOnSale, StudioSettings } from "@/lib/data";
import { formatVnd } from "@/lib/money";

export const POLICY_UPDATED = { en: "14 November 2026", vi: "14 tháng 11 năm 2026" } as const;
const BUSINESS = "The Village, 47/1 Quốc Hương, An Khánh, Hồ Chí Minh";

type Ctx = {
  locale: "en" | "vi";
  s: StudioSettings;
  packs: PackOnSale[];
  prices: { classVnd: number | null; openPlayVnd: number | null };
};

/** "+84906446214" → "+84 906 446 214". */
export function prettyPhone(p: string) {
  const m = /^\+84(\d{3})(\d{3})(\d{3,4})$/.exec(p.replace(/\s/g, ""));
  return m ? `+84 ${m[1]} ${m[2]} ${m[3]}` : p;
}

function validity(p: PackOnSale, vi: boolean) {
  if (p.validityMonths) return vi ? `${p.validityMonths} tháng` : `${p.validityMonths} ${p.validityMonths === 1 ? "month" : "months"}`;
  return vi ? `${p.validityDays} ngày` : `${p.validityDays} days`;
}

function windowText(days: number, vi: boolean) {
  if (days === 31) return vi ? "1 tháng" : "1 month";
  if (days % 31 === 0) return vi ? `${days / 31} tháng` : `${days / 31} months`;
  return vi ? `${days} ngày` : `${days} days`;
}

function Contact({ s, vi }: { s: StudioSettings; vi: boolean }) {
  return vi ? (
    <p>Nhắn tin cho chúng tôi qua WhatsApp hoặc Zalo (nút trong menu), gọi <strong>{prettyPhone(s.contactPhone)}</strong>, hoặc email <strong>{s.contactEmail}</strong>.</p>
  ) : (
    <p>Message us on WhatsApp or Zalo (the buttons in the menu), call <strong>{prettyPhone(s.contactPhone)}</strong>, or email <strong>{s.contactEmail}</strong>.</p>
  );
}

function Updated({ locale }: { locale: "en" | "vi" }) {
  return <p className="muted small">{locale === "vi" ? `Cập nhật ngày ${POLICY_UPDATED.vi}` : `Last updated ${POLICY_UPDATED.en}`}</p>;
}

function PackTable({ c }: { c: Ctx }) {
  const vi = c.locale === "vi";
  if (c.packs.length === 0) return null;
  return (
    <div className="policy-table">
      <table>
        <thead><tr><th>{vi ? "Gói" : "Pack"}</th><th>{vi ? "Số buổi" : "Classes"}</th><th>{vi ? "Giá" : "Price"}</th><th>{vi ? "Thời hạn" : "Valid for"}</th></tr></thead>
        <tbody>
          {c.packs.map((p) => (
            <tr key={p.id}>
              <td>{p.name}{p.isIntro ? (vi ? " (khách mới, mỗi người một gói)" : " (new customers, one each)") : ""}</td>
              <td>{p.credits}</td>
              <td style={{ whiteSpace: "nowrap" }}>{formatVnd(p.priceVnd, c.locale)}</td>
              <td>{validity(p, vi)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TermsContent(c: Ctx): ReactNode {
  const { s } = c;
  const cut = s.cancelCutoffTime;
  const win = windowText(s.bookingWindowDays, c.locale === "vi");
  const cls = c.prices.classVnd !== null ? formatVnd(c.prices.classVnd, c.locale) : null;
  const op = c.prices.openPlayVnd !== null ? formatVnd(c.prices.openPlayVnd, c.locale) : null;
  if (c.locale === "vi") {
    return (
      <>
        <Updated locale="vi" />
        <h2>Đặt chỗ</h2>
        <ul>
          <li>Bạn có thể đặt chỗ trực tuyến trước tối đa {win}, và chậm nhất 1 giờ trước giờ bắt đầu.</li>
          <li>Mỗi lượt đặt lớp học dành cho 1 phụ huynh và tối đa 2 bé. Lượt đặt dùng 1 buổi trong gói{cls ? `, hoặc ${cls} trả tại studio vào ngày học` : ""}; các bé tham gia miễn phí.</li>
          <li>Mỗi lượt đặt Open Play dành cho tối đa 2 bé và 2 phụ huynh{op ? `, giá ${op} mỗi bé, trả tại studio vào ngày đến` : ""}; phụ huynh miễn phí.</li>
          <li>Nếu không có gói, bạn thanh toán khi đến, bằng chuyển khoản (QR) hoặc tiền mặt. Chúng tôi không nhận thanh toán trực tuyến.</li>
          <li>Nếu đặt chỗ không cần tài khoản, mỗi lần bạn chỉ có một lượt đặt trả tại studio.</li>
          <li>Các lớp học cần đủ số người tối thiểu. Nếu có quá ít người đặt, chúng tôi có thể huỷ lớp vào tối hôm trước; chúng tôi sẽ email cho bạn và buổi học được hoàn lại vào gói (hoặc bạn không phải trả gì).</li>
        </ul>
        <h2>Huỷ chỗ</h2>
        <ul>
          <li><strong>Huỷ miễn phí trước {cut} tối hôm trước.</strong> Huỷ trong mục Lịch đã đặt và buổi học được hoàn lại vào gói ngay lập tức.</li>
          <li><strong>Sau {cut} tối hôm trước</strong>, bạn không thể huỷ trực tuyến: vui lòng nhắn tin cho chúng tôi. Buổi học trong gói sẽ bị tính, trừ khi studio quyết định hoàn lại. Lượt đặt trả tại studio không phải trả gì.</li>
          <li>Nếu bạn đặt chỗ sau {cut} tối hôm trước, lượt đặt đó không thể huỷ trực tuyến.</li>
          <li><strong>Nếu bạn không đến</strong>, buổi học trong gói sẽ bị tính. Lượt đặt trả tại studio không phải trả gì.</li>
        </ul>
        <h2>Nếu chúng tôi đổi giờ hoặc huỷ buổi học</h2>
        <ul>
          <li>Nếu chúng tôi đổi giờ một buổi học, chúng tôi sẽ email cho bạn và lượt đặt của bạn được chuyển theo. Nếu giờ mới không phù hợp, bạn có thể huỷ miễn phí, kể cả sau {cut} tối hôm trước: nhắn tin cho chúng tôi.</li>
          <li>Nếu chúng tôi huỷ một buổi học, chúng tôi sẽ email cho bạn. Buổi học được hoàn lại vào gói, hoặc bạn không phải trả gì.</li>
        </ul>
        <h2>Gói học</h2>
        <PackTable c={c} />
        <ul>
          <li>Gói dùng cho các lớp học, không dùng cho Open Play. Thời hạn tính từ ngày bắt đầu của gói.</li>
          <li>Buổi học đã hết hạn không thể sử dụng. Studio có thể gia hạn gói tuỳ trường hợp.</li>
          <li>Mỗi khách hàng được học thử miễn phí một buổi.</li>
          <li>Gói không được hoàn tiền hoặc chuyển cho người khác. Nếu bạn bị ốm hoặc đi xa, hãy nhắn tin cho chúng tôi.</li>
        </ul>
        <h2>Thuê studio</h2>
        <ul>
          <li>Thuê toàn bộ studio từ 1 giờ đến cả ngày, trong giờ mở cửa, cho tối đa {s.hireMaxGroup} người, báo trước ít nhất 24 giờ. Chúng tôi sắp xếp với bạn qua tin nhắn và bạn thanh toán trực tiếp.</li>
          <li>Huỷ miễn phí đến 24 giờ trước giờ thuê; sau đó, vui lòng trao đổi với chúng tôi.</li>
        </ul>
        <h2>Câu hỏi</h2>
        <Contact s={s} vi />
      </>
    );
  }
  return (
    <>
      <Updated locale="en" />
      <h2>Booking</h2>
      <ul>
        <li>You can book online up to {win} ahead, until 1 hour before the start.</li>
        <li>A class booking is for 1 parent and up to 2 children. It uses 1 class credit{cls ? `, or ${cls} paid at the studio on the day` : ""}; children come free.</li>
        <li>An Open Play booking is for up to 2 children and up to 2 parents{op ? `. It costs ${op} per child, paid at the studio on the day` : ""}; parents come free.</li>
        <li>Without a pack, you pay when you arrive, by bank transfer (QR) or cash. There is no online payment.</li>
        <li>If you book without an account, you can have one pay-on-the-day booking at a time.</li>
        <li>Classes need a minimum number of people. If too few are booked, we may cancel a class the evening before; we&apos;ll email you and your credit comes back (or there&apos;s nothing to pay).</li>
      </ul>
      <h2>Cancelling</h2>
      <ul>
        <li><strong>Free until {cut} the evening before.</strong> Cancel in My bookings and your credit goes straight back to your pack.</li>
        <li><strong>After {cut} the evening before</strong>, you can&apos;t cancel online: please message us. A class credit is used, unless the studio decides to give it back. Pay-on-the-day bookings have nothing to pay.</li>
        <li>If you book after {cut} the evening before, the booking can&apos;t be cancelled online.</li>
        <li><strong>If you don&apos;t come</strong>, a class credit is used. Pay-on-the-day bookings have nothing to pay.</li>
      </ul>
      <h2>If we move or cancel a session</h2>
      <ul>
        <li>If we move a session, we email you and your booking moves with it. If the new time doesn&apos;t suit you, you can cancel for free, even after {cut} the evening before: message us.</li>
        <li>If we cancel a session, we email you. Your credit comes back, or there is nothing to pay.</li>
      </ul>
      <h2>Packs</h2>
      <PackTable c={c} />
      <ul>
        <li>Packs are for classes, not Open Play. Validity runs from the pack&apos;s start date.</li>
        <li>Expired credits can&apos;t be used. The studio may extend a pack at its discretion.</li>
        <li>One free trial class per customer.</li>
        <li>Packs can&apos;t be refunded or passed to someone else. If you&apos;re ill or away, message us.</li>
      </ul>
      <h2>Private hire</h2>
      <ul>
        <li>Hire the whole studio from 1 hour up to a full day, within opening hours, for up to {s.hireMaxGroup} people, with at least 24 hours&apos; notice. We arrange it with you by message and you pay in person.</li>
        <li>Free to cancel up to 24 hours before; after that, please talk to us.</li>
      </ul>
      <h2>Questions</h2>
      <Contact s={s} vi={false} />
    </>
  );
}

const PROCESSORS = [
  { name: "Supabase", en: "Stores the app's data and handles login", vi: "Lưu dữ liệu của ứng dụng và xử lý đăng nhập", where: { en: "Singapore", vi: "Singapore" } },
  { name: "Vercel", en: "Runs the app and its bot check", vi: "Vận hành ứng dụng và kiểm tra chống bot", where: { en: "Singapore", vi: "Singapore" } },
  { name: "Resend", en: "Sends our emails", vi: "Gửi email của chúng tôi", where: { en: "Japan (company in the USA)", vi: "Nhật Bản (công ty tại Mỹ)" } },
  { name: "Sentry", en: "Tells us when the app has an error; sending names, contact details and form contents is switched off", vi: "Báo cho chúng tôi khi ứng dụng gặp lỗi; không gửi tên, thông tin liên hệ hay nội dung biểu mẫu", where: { en: "Germany", vi: "Đức" } },
];

export function PrivacyContent(c: Ctx): ReactNode {
  const { s } = c;
  if (c.locale === "vi") {
    return (
      <>
        <Updated locale="vi" />
        <p>{BUSINESS} vận hành ứng dụng đặt chỗ này. Trang này giải thích chúng tôi lưu những gì về bạn và các bé, vì sao, và bạn có thể yêu cầu chúng tôi làm gì với thông tin đó.</p>
        <h2>Chúng tôi lưu những gì</h2>
        <div className="policy-table"><table>
          <thead><tr><th>Thông tin</th><th>Để làm gì</th></tr></thead>
          <tbody>
            <tr><td>Địa chỉ email</td><td>Để bạn đăng nhập (chúng tôi gửi mã qua email) và gửi email về lịch đặt</td></tr>
            <tr><td>Họ tên, số điện thoại và cách bạn muốn được liên hệ (WhatsApp, Zalo hoặc gọi điện)</td><td>Để biết ai đã đặt chỗ và liên hệ với bạn về lịch đặt</td></tr>
            <tr><td>Ngôn ngữ bạn chọn</td><td>Để hiển thị ứng dụng và email bằng tiếng Anh hoặc tiếng Việt</td></tr>
            <tr><td>Tên các bé và, nếu bạn cung cấp, tháng và năm sinh</td><td>Để biết ai sẽ đến và lớp học có phù hợp với độ tuổi của bé không</td></tr>
            <tr><td>Lịch đặt, việc tham gia, gói học, số buổi còn lại và thanh toán (chỉ số tiền và hình thức)</td><td>Để quản lý lịch đặt, điểm danh và sổ sách của studio</td></tr>
            <tr><td>Thời gian và cách nhân viên đã liên hệ với bạn về một lượt đặt</td><td>Để không ai bị bỏ sót hoặc được liên hệ hai lần</td></tr>
            <tr><td>Danh sách email chúng tôi đã gửi cho bạn</td><td>Để mỗi email chỉ được gửi một lần</td></tr>
          </tbody>
        </table></div>
        <p>Chúng tôi không bao giờ thấy hay lưu thông tin thẻ hoặc tài khoản ngân hàng: bạn thanh toán tại studio. Tin nhắn qua WhatsApp hoặc Zalo tuân theo chính sách riêng của các ứng dụng đó.</p>
        <h2>Cookie</h2>
        <p>Ứng dụng chỉ dùng một loại cookie: cookie giữ cho bạn đăng nhập. Không có cookie quảng cáo hay theo dõi, và không có công cụ phân tích. Điện thoại của bạn có thể ghi nhớ vài điều nhỏ, như biểu mẫu đang điền dở, ngay trên máy của bạn.</p>
        <h2>Ai có thể xem</h2>
        <ul>
          <li><strong>Quản lý và nhân viên lễ tân của studio</strong> xem thông tin khách hàng, lịch đặt và thanh toán.</li>
          <li><strong>Giáo viên</strong> xem những người đã đặt các buổi học mà họ dạy.</li>
          <li><strong>Đường dẫn lịch</strong> bạn thêm vào điện thoại chỉ hiển thị tên và giờ buổi học, không bao giờ có tên người.</li>
          <li><strong>Các công ty vận hành một phần ứng dụng cho chúng tôi</strong>, chỉ cho mục đích đó:</li>
        </ul>
        <div className="policy-table"><table>
          <thead><tr><th>Công ty</th><th>Làm gì</th><th>Ở đâu</th></tr></thead>
          <tbody>{PROCESSORS.map((p) => <tr key={p.name}><td>{p.name}</td><td>{p.vi}</td><td>{p.where.vi}</td></tr>)}</tbody>
        </table></div>
        <p>Chúng tôi không bao giờ bán thông tin của bạn hay dùng nó cho quảng cáo. Chúng tôi không gửi email tiếp thị: chỉ gửi email về lịch đặt (xác nhận, nhắc lịch và thay đổi).</p>
        <h2>Chúng tôi lưu trong bao lâu</h2>
        <ul>
          <li>Trong thời gian bạn có tài khoản, và 2 năm kể từ lần bạn đến gần nhất.</li>
          <li>Hồ sơ thanh toán được lưu theo thời hạn quy định của pháp luật kế toán Việt Nam.</li>
          <li>Khi xoá thông tin, chúng tôi xoá họ tên, số điện thoại, email và thông tin của các bé, chỉ giữ lại hồ sơ lịch đặt và thanh toán ẩn danh cho sổ sách.</li>
        </ul>
        <h2>Bạn có thể yêu cầu</h2>
        <ul>
          <li><strong>Xem</strong> những gì chúng tôi lưu về bạn.</li>
          <li><strong>Sửa</strong> thông tin: bạn có thể tự sửa trong ứng dụng.</li>
          <li><strong>Xoá</strong> thông tin: hiện tại hãy nhắn tin cho chúng tôi.</li>
          <li><strong>Ngừng</strong> việc sử dụng thông tin, hoặc <strong>rút lại</strong> sự đồng ý của bạn.</li>
        </ul>
        <Contact s={s} vi />
        <p>Chúng tôi sẽ trả lời trong vòng 7 ngày.</p>
        <h2>Thay đổi</h2>
        <p>Nếu chúng tôi thay đổi trang này, chúng tôi sẽ cập nhật ngày ở đầu trang.</p>
      </>
    );
  }
  return (
    <>
      <Updated locale="en" />
      <p>{BUSINESS} runs this booking app. This page explains what we keep about you and your children, why, and what you can ask us to do with it.</p>
      <h2>What we keep</h2>
      <div className="policy-table"><table>
        <thead><tr><th>What</th><th>Why</th></tr></thead>
        <tbody>
          <tr><td>Your email address</td><td>To log you in (we email you a code) and send booking emails</td></tr>
          <tr><td>Your name, mobile number and how you like to be contacted (WhatsApp, Zalo or a call)</td><td>To know who is booked and to reach you about your bookings</td></tr>
          <tr><td>Your preferred language</td><td>To show the app and emails in English or Vietnamese</td></tr>
          <tr><td>Your children&apos;s names and, if you give it, their month and year of birth</td><td>To know who is coming and that a class suits their age</td></tr>
          <tr><td>Your bookings, attendance, packs, credits and payments (amount and method only)</td><td>To run your bookings, check you in and keep the studio&apos;s accounts</td></tr>
          <tr><td>When and how our staff got in touch with you about a booking</td><td>So nobody is missed or contacted twice</td></tr>
          <tr><td>A record of the emails we&apos;ve sent you</td><td>To make sure each email is sent once</td></tr>
        </tbody>
      </table></div>
      <p>We never see or keep card or bank details: you pay at the studio. If you message us on WhatsApp or Zalo, those messages are covered by those apps&apos; own policies.</p>
      <h2>Cookies</h2>
      <p>The app uses one kind of cookie: the one that keeps you logged in. There are no advertising or tracking cookies, and no analytics. Your phone may remember small things, such as a half-filled form, on the phone itself.</p>
      <h2>Who can see it</h2>
      <ul>
        <li><strong>Studio managers and front-desk staff</strong> see customer details, bookings and payments.</li>
        <li><strong>Instructors</strong> see the people booked into the sessions they teach.</li>
        <li><strong>Calendar links</strong> you add to your phone show session titles and times only, never names.</li>
        <li><strong>Companies that run parts of the app for us</strong>, only for that purpose:</li>
      </ul>
      <div className="policy-table"><table>
        <thead><tr><th>Company</th><th>What it does</th><th>Where</th></tr></thead>
        <tbody>{PROCESSORS.map((p) => <tr key={p.name}><td>{p.name}</td><td>{p.en}</td><td>{p.where.en}</td></tr>)}</tbody>
      </table></div>
      <p>We never sell your details or use them for advertising. We don&apos;t send marketing emails: only booking emails (confirmations, reminders and changes).</p>
      <h2>How long we keep it</h2>
      <ul>
        <li>While you have an account, and for 2 years after your last visit.</li>
        <li>Payment records for as long as Vietnamese accounting rules require.</li>
        <li>When details are deleted, we remove your name, phone, email and your children&apos;s details, and keep only anonymous booking and payment records for the accounts.</li>
      </ul>
      <h2>What you can ask us</h2>
      <ul>
        <li><strong>See</strong> what we keep about you.</li>
        <li><strong>Correct</strong> it: you can change your details in the app.</li>
        <li><strong>Delete</strong> it: message us for now.</li>
        <li><strong>Stop</strong> us using it, or <strong>withdraw</strong> your consent.</li>
      </ul>
      <Contact s={s} vi={false} />
      <p>We&apos;ll reply within 7 days.</p>
      <h2>Changes</h2>
      <p>If we change this page, we&apos;ll update the date at the top.</p>
    </>
  );
}
