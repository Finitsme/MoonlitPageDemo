// ใช้ export const เพื่อให้ไฟล์อื่นสามารถ import ข้อมูลนี้ไปใช้ได้
export const categoriesData = [
  { 
    name: 'นิยาย', 
    key: 'Fiction',
    query: 'Fiction', // <--- เพิ่มคำค้นหาหลักสำหรับนิยาย
    subcategories: [
      { name: 'แฟนตาซี', query: 'Fantasy' },
      { name: 'สยองขวัญ', query: 'Fiction, Horror' },
      { name: 'ตลก/ฟีลกู๊ด', query: 'Humor' },
      { name: 'วรรณกรรม', query: 'Literature' },
      { name: 'เวทมนตร์', query: 'Magic' },
      { name: 'ลึกลับ/สืบสวน', query: 'Mystery and detective stories' },
      { name: 'บทกวี', query: 'Poetry' },
      { name: 'Sci-fi', query: 'Science Fiction' },
      { name: 'ระทึกขวัญ', query: 'Thriller' },
      { name: 'วัยรุ่น', query: 'Young Adult' }
    ]
  },
  { 
    name: 'วิทยาศาสตร์ & คณิตศาสตร์', 
    key: 'Sci & Math',
    query: 'Science & Mathematics', // <--- เพิ่มคำค้นหาหลักสำหรับวิทยาศาสตร์
    subcategories: [
      { name: 'คณิตศาสตร์', query: 'Mathematics' },
      { name: 'ฟิสิกส์', query: 'Physics' },
      { name: 'เคมี', query: 'Chemistry' },
      { name: 'ชีวะ', query: 'Biology' },
      { name: 'การเขียนโปรแกรม', query: 'Programming' },
    ]
  },
  { 
    name: 'ประวัติศาสตร์', 
    key: 'History', 
    query: 'History',
    subcategories: [
      { name: 'อารยธรรม', query: 'Ancient Civilization' },
      { name: 'โบราณคดี', query: 'Archaeology' },
      { name: 'มานุษยวิทยา', query: 'Anthropology' },
      { name: 'สงครามโลกครั้งที่สอง', query: 'World War II' },
      { name: 'วิถีชีวิต/ประเพณี', query: 'Social Life and Customs' },
    ]
  },
  { 
    name: 'สุขภาพ', 
    key: 'Health', 
    query: 'Health & Wellness',
    subcategories: [
      { name: 'การทำอาหาร', query: 'Cooking' },
      { name: 'ตำราอาหาร', query: 'Cookbooks' },
      { name: 'สุขภาพจิต', query: 'Mental Health' },
      { name: 'การออกกำลังกาย', query: 'Exercise' },
      { name: 'โภชนาการ', query: 'Nutrition' }
    ] 
  },
{ 
    name: 'ศิลปะ', 
    key: 'Arts', 
    query: 'Arts',
    subcategories: [
      { name: 'สถาปัตยกรรม', query: 'Architecture' },
      { name: 'การเต้น', query: 'Dance' },
      { name: 'การออกแบบ', query: 'Design' },
      { name: 'แฟชั่น', query: 'Fashion' },
      { name: 'ภาพยนตร์', query: 'Film' },
      { name: 'การออกแบบกราฟิก', query: 'Graphic Design' },
      { name: 'ดนตรี', query: 'Music' },
      { name: 'จิตรกรรม', query: 'Painting' },
      { name: 'การถ่ายภาพ', query: 'Photography' }
    ] 
  }
];