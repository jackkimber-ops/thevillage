-- The owners' class descriptions and taglines, badges for every class, and Phuong teaching Core & Cuddle (Jack, 3 Nov).
-- Run after migration 20261103000001_class_taglines and after the badge pictures are deployed (apps/booking/public/brand/badges).
-- Applied once to staging, then production.

begin;

-- Strong & Snuggly: a new class type, not on the timetable yet (staff add sessions from the calendar).
insert into public.session_types (id, kind, name, colour, default_minutes, default_capacity, drop_in_price_vnd)
values ('00000000-0000-4000-8000-000000000009', 'class', 'Strong & Snuggly', '#FFBEA1', 60, 10, 450000)
on conflict (id) do nothing;
insert into public.pack_type_covers (pack_type_id, session_type_id)
select p.id, '00000000-0000-4000-8000-000000000009'::uuid from public.pack_types p
where p.id in ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000103')
on conflict do nothing;

-- Every class has its own badge (from the Instagram set): the three unused ones go to the classes that had none.
update public.session_types set picture_url = '/brand/badges/breathe-unwind.png' where id = '00000000-0000-4000-8000-000000000007';
update public.session_types set picture_url = '/brand/badges/bump-breathe.png' where id = '00000000-0000-4000-8000-000000000008';
update public.session_types set picture_url = '/brand/badges/strong-snuggly.png' where id = '00000000-0000-4000-8000-000000000009';

-- Taglines and descriptions (English).
update public.session_types set tagline = 'Move, strengthen & bond',
  description = 'A gentle mat Pilates class designed to help mums rebuild strength, improve core stability and reconnect with their bodies after birth. With your baby right beside you, there''s no pressure to keep up or get everything perfect. Pause to feed, cuddle or settle your little one whenever you need.'
  where id = '00000000-0000-4000-8000-000000000004'; -- Core & Cuddle
update public.session_types set tagline = 'Little moves, big connections.',
  description = 'A playful yoga class for parents and little ones to move, stretch and explore together. Through simple yoga poses, playful movement, breathing and moments of calm, you''ll nurture connection while helping your child develop body awareness, balance and coordination. Little ones are free to join in at their own pace.'
  where id = '00000000-0000-4000-8000-000000000005'; -- Little Yogi & Me
update public.session_types set tagline = 'A little play, a lot of wonder.',
  description = 'A relaxed, welcoming space for little ones to play, explore and discover the world alongside their grown-ups. Through open-ended play, sensory experiences and movement, children can follow their curiosity, build confidence and learn through play, while parents connect with their little ones and other families.'
  where id = '00000000-0000-4000-8000-000000000006'; -- Wiggle & Wonder
update public.session_types set tagline = 'Move, breathe & grow together.',
  description = 'A nurturing yoga class to support you through the changes of pregnancy. Gentle movement, mobility, breathing and relaxation help you stay active, ease everyday tension and feel more comfortable in your changing body. A little time to slow down, tune in and connect with yourself and your growing baby.'
  where id = '00000000-0000-4000-8000-000000000008'; -- Bump & Breathe
update public.session_types set tagline = 'Build strength, embrace motherhood.',
  description = 'A full-body strength class designed to help mums build muscle, improve stability and develop functional strength for everyday life. Through strength-based exercises and purposeful movement, you''ll work on getting stronger, feeling more capable and building confidence, all with your little one close by.'
  where id = '00000000-0000-4000-8000-000000000009'; -- Strong & Snuggly
update public.session_types set tagline = 'Slow down, stretch & reconnect.',
  description = 'A gentle movement class for mums who need a little time to loosen up, release tension and reconnect with their bodies. Through easy stretches, mobility exercises and relaxed breathing, you''ll work on moving more comfortably and easing the stiffness that can come with pregnancy, postpartum recovery and caring for a little one. Bring your baby along and take a moment just for you.'
  where id = '00000000-0000-4000-8000-000000000007'; -- Breathe & Unwind

-- Taglines and descriptions (Vietnamese, from the owners).
update public.session_types set tagline_vi = 'Cùng vận động, khỏe hơn và gắn kết hơn.',
  description_vi = 'Lớp Pilates trên thảm nhẹ nhàng, giúp mẹ lấy lại sức mạnh cơ bắp, cải thiện sự ổn định của vùng cơ lõi và kết nối lại với cơ thể sau sinh. Bé luôn ở ngay bên cạnh, nên mẹ không cần lo phải theo kịp mọi người hay thực hiện mọi động tác thật hoàn hảo. Mẹ có thể thoải mái tạm dừng để cho bé bú, ôm ấp hoặc dỗ dành bé bất cứ khi nào cần.'
  where id = '00000000-0000-4000-8000-000000000004'; -- Core & Cuddle
update public.session_types set tagline_vi = 'Vận động nhỏ, gắn kết lớn.',
  description_vi = 'Lớp yoga vui nhộn dành cho bố mẹ và bé cùng vận động, kéo giãn cơ thể và khám phá những điều mới mẻ. Thông qua các tư thế yoga đơn giản, hoạt động vận động thú vị, bài tập hít thở và những phút giây thư giãn, bố mẹ và bé sẽ thêm gắn kết, đồng thời giúp bé phát triển khả năng nhận thức cơ thể, giữ thăng bằng và phối hợp vận động. Bé có thể tự do tham gia theo nhịp độ riêng của mình.'
  where id = '00000000-0000-4000-8000-000000000005'; -- Little Yogi & Me
update public.session_types set tagline_vi = 'Chơi một chút, khám phá thật nhiều.',
  description_vi = 'Không gian vui chơi thoải mái và thân thiện, nơi các bé được tự do khám phá, trải nghiệm và tìm hiểu thế giới cùng bố mẹ. Thông qua các hoạt động chơi mở, trải nghiệm giác quan và vận động, bé được khuyến khích làm theo sự tò mò tự nhiên, xây dựng sự tự tin và học hỏi qua vui chơi. Đây cũng là cơ hội để bố mẹ gắn kết với bé và giao lưu cùng những gia đình khác.'
  where id = '00000000-0000-4000-8000-000000000006'; -- Wiggle & Wonder
update public.session_types set tagline_vi = 'Cùng vận động, hít thở và lớn lên mỗi ngày.',
  description_vi = 'Lớp yoga nhẹ nhàng, giúp mẹ chăm sóc cơ thể và tinh thần trong suốt thai kỳ. Các bài tập vận động, tăng độ linh hoạt, hít thở và thư giãn giúp mẹ duy trì sự năng động, giảm căng thẳng và cảm thấy dễ chịu hơn khi cơ thể thay đổi. Đây là khoảng thời gian để mẹ sống chậm lại, lắng nghe cơ thể và kết nối với em bé đang lớn lên từng ngày.'
  where id = '00000000-0000-4000-8000-000000000008'; -- Bump & Breathe
update public.session_types set tagline_vi = 'Thêm khỏe mạnh, thêm tự tin trên hành trình làm mẹ.',
  description_vi = 'Lớp tập tăng cường sức mạnh toàn thân, giúp mẹ phát triển cơ bắp, cải thiện khả năng giữ thăng bằng và xây dựng sức mạnh để thực hiện các hoạt động hằng ngày dễ dàng hơn. Thông qua các bài tập sức mạnh và vận động có mục đích, mẹ sẽ dần trở nên khỏe khoắn, tự tin và chủ động hơn trong cuộc sống, trong khi bé yêu vẫn luôn ở ngay bên cạnh.'
  where id = '00000000-0000-4000-8000-000000000009'; -- Strong & Snuggly
update public.session_types set tagline_vi = 'Sống chậm lại, thả lỏng và kết nối với bản thân.',
  description_vi = 'Lớp vận động nhẹ nhàng dành cho những người mẹ muốn dành chút thời gian thả lỏng, giải tỏa căng thẳng và kết nối lại với cơ thể. Thông qua các động tác kéo giãn đơn giản, bài tập tăng độ linh hoạt và hít thở thư giãn, mẹ sẽ cảm thấy vận động thoải mái hơn, giảm tình trạng căng cứng cơ thường gặp trong thai kỳ, sau sinh hoặc khi chăm sóc con nhỏ. Mẹ có thể mang bé theo và tận hưởng một chút thời gian dành riêng cho bản thân.'
  where id = '00000000-0000-4000-8000-000000000007'; -- Breathe & Unwind

-- Phuong teaches every Core & Cuddle session.
update public.sessions set instructor_id = (select u.id from auth.users u join public.staff_roles r on r.user_id = u.id where u.email = 'ph.nguyen4787@gmail.com')
where session_type_id = '00000000-0000-4000-8000-000000000004' and status = 'scheduled' and starts_at >= now();

commit;
