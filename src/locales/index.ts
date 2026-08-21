/** English base dictionary and common-namespace key-set source of truth. */
export const en = {
  ok: 'OK',
  cancel: 'Cancel',
  close: 'Close',
  copy: 'Copy',
  copied: 'Copied',
  retry: 'Retry',
  loading: 'Loading…',
  'load.failed': 'Failed to load',
  submit: 'Submit',
  submitting: 'Submitting…',
  next: 'Next',
  previous: 'Previous',
  skip: 'Skip',
  delete: 'Delete',
  edit: 'Edit',
  save: 'Save',
  search: 'Search',
  more: 'More',
  collapse: 'Collapse',
  expand: 'Expand',
  back: 'Back',
  unknown: 'Unknown',
  none: 'None',
  truncated: 'Truncated',
} as const

export type CommonKey = keyof typeof en
type CommonDict = Record<CommonKey, string>

export const zh: CommonDict = {
  ok: '确定', cancel: '取消', close: '关闭', copy: '复制', copied: '复制成功', retry: '重试',
  loading: '加载中…', 'load.failed': '加载失败', submit: '提交', submitting: '正在提交…',
  next: '下一步', previous: '上一步', skip: '跳过', delete: '删除', edit: '编辑', save: '保存',
  search: '搜索', more: '更多', collapse: '收起', expand: '展开', back: '返回', unknown: '未知',
  none: '无', truncated: '已截断',
}

export const zhTW: CommonDict = {
  ok: '確定', cancel: '取消', close: '關閉', copy: '複製', copied: '已複製', retry: '重試',
  loading: '載入中…', 'load.failed': '載入失敗', submit: '提交', submitting: '正在提交…',
  next: '下一步', previous: '上一步', skip: '略過', delete: '刪除', edit: '編輯', save: '儲存',
  search: '搜尋', more: '更多', collapse: '收合', expand: '展開', back: '返回', unknown: '未知',
  none: '無', truncated: '已截斷',
}

export const ja: CommonDict = {
  ok: 'OK', cancel: 'キャンセル', close: '閉じる', copy: 'コピー', copied: 'コピーしました', retry: '再試行',
  loading: '読み込み中…', 'load.failed': '読み込みに失敗しました', submit: '送信', submitting: '送信中…',
  next: '次へ', previous: '前へ', skip: 'スキップ', delete: '削除', edit: '編集', save: '保存',
  search: '検索', more: 'その他', collapse: '折りたたむ', expand: '展開', back: '戻る', unknown: '不明',
  none: 'なし', truncated: '省略済み',
}

export const ko: CommonDict = {
  ok: '확인', cancel: '취소', close: '닫기', copy: '복사', copied: '복사됨', retry: '다시 시도',
  loading: '불러오는 중…', 'load.failed': '불러오지 못했습니다', submit: '제출', submitting: '제출 중…',
  next: '다음', previous: '이전', skip: '건너뛰기', delete: '삭제', edit: '편집', save: '저장',
  search: '검색', more: '더 보기', collapse: '접기', expand: '펼치기', back: '뒤로', unknown: '알 수 없음',
  none: '없음', truncated: '일부 생략됨',
}

export const es: CommonDict = {
  ok: 'Aceptar', cancel: 'Cancelar', close: 'Cerrar', copy: 'Copiar', copied: 'Copiado', retry: 'Reintentar',
  loading: 'Cargando…', 'load.failed': 'Error al cargar', submit: 'Enviar', submitting: 'Enviando…',
  next: 'Siguiente', previous: 'Anterior', skip: 'Omitir', delete: 'Eliminar', edit: 'Editar', save: 'Guardar',
  search: 'Buscar', more: 'Más', collapse: 'Contraer', expand: 'Expandir', back: 'Atrás', unknown: 'Desconocido',
  none: 'Ninguno', truncated: 'Truncado',
}

export const fr: CommonDict = {
  ok: 'OK', cancel: 'Annuler', close: 'Fermer', copy: 'Copier', copied: 'Copié', retry: 'Réessayer',
  loading: 'Chargement…', 'load.failed': 'Échec du chargement', submit: 'Envoyer', submitting: 'Envoi…',
  next: 'Suivant', previous: 'Précédent', skip: 'Ignorer', delete: 'Supprimer', edit: 'Modifier', save: 'Enregistrer',
  search: 'Rechercher', more: 'Plus', collapse: 'Réduire', expand: 'Développer', back: 'Retour', unknown: 'Inconnu',
  none: 'Aucun', truncated: 'Tronqué',
}

export const de: CommonDict = {
  ok: 'OK', cancel: 'Abbrechen', close: 'Schließen', copy: 'Kopieren', copied: 'Kopiert', retry: 'Erneut versuchen',
  loading: 'Wird geladen…', 'load.failed': 'Laden fehlgeschlagen', submit: 'Absenden', submitting: 'Wird gesendet…',
  next: 'Weiter', previous: 'Zurück', skip: 'Überspringen', delete: 'Löschen', edit: 'Bearbeiten', save: 'Speichern',
  search: 'Suchen', more: 'Mehr', collapse: 'Einklappen', expand: 'Ausklappen', back: 'Zurück', unknown: 'Unbekannt',
  none: 'Keine', truncated: 'Gekürzt',
}

export const ptBR: CommonDict = {
  ok: 'OK', cancel: 'Cancelar', close: 'Fechar', copy: 'Copiar', copied: 'Copiado', retry: 'Tentar novamente',
  loading: 'Carregando…', 'load.failed': 'Falha ao carregar', submit: 'Enviar', submitting: 'Enviando…',
  next: 'Próximo', previous: 'Anterior', skip: 'Pular', delete: 'Excluir', edit: 'Editar', save: 'Salvar',
  search: 'Pesquisar', more: 'Mais', collapse: 'Recolher', expand: 'Expandir', back: 'Voltar', unknown: 'Desconhecido',
  none: 'Nenhum', truncated: 'Truncado',
}

export const ru: CommonDict = {
  ok: 'ОК', cancel: 'Отмена', close: 'Закрыть', copy: 'Копировать', copied: 'Скопировано', retry: 'Повторить',
  loading: 'Загрузка…', 'load.failed': 'Не удалось загрузить', submit: 'Отправить', submitting: 'Отправка…',
  next: 'Далее', previous: 'Назад', skip: 'Пропустить', delete: 'Удалить', edit: 'Изменить', save: 'Сохранить',
  search: 'Поиск', more: 'Ещё', collapse: 'Свернуть', expand: 'Развернуть', back: 'Назад', unknown: 'Неизвестно',
  none: 'Нет', truncated: 'Сокращено',
}

export const ar: CommonDict = {
  ok: 'موافق', cancel: 'إلغاء', close: 'إغلاق', copy: 'نسخ', copied: 'تم النسخ', retry: 'إعادة المحاولة',
  loading: 'جارٍ التحميل…', 'load.failed': 'فشل التحميل', submit: 'إرسال', submitting: 'جارٍ الإرسال…',
  next: 'التالي', previous: 'السابق', skip: 'تخطي', delete: 'حذف', edit: 'تعديل', save: 'حفظ',
  search: 'بحث', more: 'المزيد', collapse: 'طي', expand: 'توسيع', back: 'رجوع', unknown: 'غير معروف',
  none: 'لا شيء', truncated: 'مختصر',
}

export const hi: CommonDict = {
  ok: 'ठीक है', cancel: 'रद्द करें', close: 'बंद करें', copy: 'कॉपी करें', copied: 'कॉपी किया गया', retry: 'फिर प्रयास करें',
  loading: 'लोड हो रहा है…', 'load.failed': 'लोड नहीं हो सका', submit: 'सबमिट करें', submitting: 'सबमिट हो रहा है…',
  next: 'अगला', previous: 'पिछला', skip: 'छोड़ें', delete: 'हटाएँ', edit: 'संपादित करें', save: 'सहेजें',
  search: 'खोजें', more: 'और', collapse: 'समेटें', expand: 'फैलाएँ', back: 'वापस', unknown: 'अज्ञात',
  none: 'कोई नहीं', truncated: 'संक्षिप्त',
}

export const commonDictionaries = {
  en,
  zh,
  'zh-TW': zhTW,
  ja,
  ko,
  es,
  fr,
  de,
  'pt-BR': ptBR,
  ru,
  ar,
  hi,
} satisfies Record<string, CommonDict>
