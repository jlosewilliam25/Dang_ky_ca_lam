import { NextResponse } from 'next/server';

export async function POST(request) {
  // Nhận dữ liệu đăng ký ca làm
  const data = await request.json();
  // TODO: Lưu dữ liệu vào SQL (giả lập lưu tạm thời)
  // Trả về trạng thái thành công
  return NextResponse.json({ success: true, message: 'Đã nhận đăng ký', data });
}

export async function GET() {
  // TODO: Trả về danh sách lịch đăng ký của nhân viên từ SQL
  return NextResponse.json({ schedules: [] });
}
