// ============================================================
// 后端配置
//
// 优先用 endpoint（腾讯云开发云函数地址）。它有值就全部走它，
// 下面的 Supabase 配置会被忽略。
//
// ⚠️ Supabase 这把只是 publishable / anon，公开也安全；
//    secret / service_role 那把只放在电脑本地 tools/supabase.env。
// ============================================================
window.SB = {
  // 腾讯云开发「HTTP 访问服务」给的地址，形如：
  // https://xxx.service.tcloudbase.com/submit
  endpoint: '',

  // 旧后端（国内访问不稳定，保留作备用）
  url: 'https://tajfkquemrkjmvbqdeya.supabase.co',
  anonKey: 'sb_publishable_T5Dq2RKwXmAmoREOmvAo6A_QrbNL80D',

  week: '第1周'
};
