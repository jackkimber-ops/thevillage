-- The owners' Open Play tagline and description, English and Vietnamese (Jack, 3 Nov).
update public.session_types set
  tagline = 'Little Adventures',
  tagline_vi = 'Những cuộc phiêu lưu nhỏ',
  description = 'A relaxed, welcoming space for parents and little ones to play, create, explore and enjoy time together. With toys, activities and plenty of room for curious minds to discover, children are free to play at their own pace while parents join in, unwind or catch up with friends.',
  description_vi = 'Không gian vui chơi thoải mái và thân thiện, nơi bố mẹ và các bé có thể cùng nhau vui chơi, sáng tạo, khám phá và tận hưởng thời gian bên nhau. Với nhiều đồ chơi, hoạt động thú vị và không gian rộng rãi để bé thỏa sức khám phá, các bé có thể tự do vui chơi theo nhịp độ riêng, trong khi bố mẹ cùng tham gia, thư giãn hoặc trò chuyện với bạn bè.'
where id = '00000000-0000-4000-8000-000000000002';
