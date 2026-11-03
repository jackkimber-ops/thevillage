-- The owners' Open Play tagline and description (Jack, 3 Nov). The Vietnamese description arrived cut off
-- ("... các bé có thể tự"), so it waits for the full text; Vietnamese pages show the English until then.
update public.session_types set
  tagline = 'Little Adventures',
  tagline_vi = 'Những cuộc phiêu lưu nhỏ',
  description = 'A relaxed, welcoming space for parents and little ones to play, create, explore and enjoy time together. With toys, activities and plenty of room for curious minds to discover, children are free to play at their own pace while parents join in, unwind or catch up with friends.'
where id = '00000000-0000-4000-8000-000000000002';
