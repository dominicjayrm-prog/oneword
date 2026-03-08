export default {
  // Onboarding
  onboarding: {
    screen1_label: 'LA PALABRA DE HOY',
    screen1_subtitle: 'naturaleza \u00B7 d\u00EDa 1',
    screen1_prompt: 'DESCR\u00CDBELA EN EXACTAMENTE 5 PALABRAS',
    screen1_counter: '5/5 palabras \u2713',
    screen1_example_word: 'OC\u00C9ANO',
    screen1_example: ['Piscina', 'infinita', 'sin', 'cloro', 'gratis'],
    screen2_label: 'EL MUNDO VOTA',
    screen2_title: '\u00BFCu\u00E1l es mejor?',
    screen2_subtitle: 'Toca para votar. Las mejores suben arriba.',
    screen2_pick: 'TU ELECCI\u00D3N \u2713',
    screen2_progress: 'voto 4 de 15',
    screen2_desc1: 'Piscina infinita sin cloro gratis',
    screen2_desc2: 'Dios llenó la bañera entera',
    screen3_label: 'SUBE EN EL RANKING',
    screen3_title: 'Compite globalmente',
    screen3_subtitle: 'Crea rachas. Lidera el ranking. Comparte lo mejor.',
    screen3_entries: [
      { desc: '"Piscina infinita sin cloro gratis"', user: '@sara', votes: 847 },
      { desc: '"Dios llenó la bañera entera"', user: '@miguel', votes: 723 },
      { desc: '"Lágrimas saladas del planeta Tierra"', user: '@luna', votes: 694 },
    ],
    screen3_stats: [
      { label: 'RACHA DE D\u00CDAS', value: '12' },
      { label: 'MEJOR PUESTO', value: '#3' },
      { label: 'RESULTADOS', value: 'share' },
    ],
  },
  nav_next: 'Siguiente',
  nav_back: 'Atr\u00E1s',
  nav_letsplay: '\u00A1A jugar! \u2192',

  // Auth
  auth: {
    tagline: '5 palabras. 1 ganador. Cada d\u00EDa.',
    signup_username: 'Nombre de usuario',
    signup_email: 'Correo electr\u00F3nico',
    signup_password: 'Contrase\u00F1a',
    signup_button: 'Registrarse',
    login_button: 'Iniciar Sesi\u00F3n',
    login_link: '\u00BFNo tienes cuenta? Reg\u00EDstrate',
    signup_link: '\u00BFYa tienes cuenta? Inicia sesi\u00F3n',
    language_label: 'Jugando en',
    verify_title: 'Revisa tu correo',
    verify_subtitle: 'Enviamos un enlace de confirmaci\u00F3n a {{email}}. Toca el enlace para verificar tu cuenta.',
    verify_resend: 'Reenviar correo',
    verify_resent: '\u00A1Correo enviado!',
    verify_back: 'Volver a iniciar sesi\u00F3n',
  },

  // Game
  game: {
    todays_word: 'LA PALABRA DE HOY',
    prompt: 'Descr\u00EDbela en exactamente 5 palabras',
    placeholder: 'Escribe tus cinco palabras...',
    submit: 'ENVIAR',
    your_description: 'TU DESCRIPCI\u00D3N',
    locked_in: 'Enviado',
    vote_others: 'VOTAR OTROS',
    see_results: 'VER RESULTADOS',
    no_word: 'A\u00FAn no hay palabra para hoy.',
    no_word_sub: '\u00A1Vuelve pronto!',
    day_streak: 'racha de {{count}} d\u00EDas',
  },

  // Voting
  vote: {
    of: '{{current}} de {{total}}',
    tap_prefer: 'Toca el que prefieras',
    done_title: '\u00A1Votaci\u00F3n completa!',
    no_more: 'No hay m\u00E1s pares',
    voted_on: 'Votaste {{count}} par',
    voted_on_plural: 'Votaste {{count}} pares',
    see_results: 'VER RESULTADOS',
    back_home: 'VOLVER AL INICIO',
    no_pairs: 'A\u00FAn no hay pares disponibles',
    report: 'Reportar',
    report_title: 'Reportar descripci\u00F3n',
    report_message: '\u00BFMarcar esta descripci\u00F3n como inapropiada?',
    report_cancel: 'Cancelar',
    report_confirm: 'Reportar',
    reported: 'Reportado',
    reported_message: 'Gracias por ayudar a mantener OneWord limpio.',
  },

  // Results
  results: {
    leaderboard: 'CLASIFICACI\u00D3N',
    no_results: 'A\u00FAn no hay resultados.',
    no_results_sub: '\u00A1Vota m\u00E1s para ver el ranking!',
    share_results: 'COMPARTIR RESULTADOS',
    back_home: 'VOLVER AL INICIO',
    share_preview: 'Vista previa',
    share_btn: 'COMPARTIR',
    cancel: 'CANCELAR',
  },

  // Profile
  profile: {
    tap_to_change: 'Toca para cambiar',
    member_since: 'Miembro desde {{date}}',
    choose_avatar: 'ELEGIR AVATAR',
    current_streak: 'Racha Actual',
    best_streak: 'Mejor Racha',
    total_plays: 'Partidas Jugadas',
    votes_received: 'Votos Recibidos',
    best_rank: 'Mejor Puesto',
    language: 'Idioma',
    back_home: 'VOLVER AL INICIO',
    log_out: 'Cerrar Sesi\u00F3n',
    log_out_title: 'Cerrar Sesi\u00F3n',
    log_out_message: '\u00BFSeguro que quieres cerrar sesi\u00F3n?',
    delete_account: 'Eliminar Cuenta',
    deleting: 'Eliminando...',
    delete_title: 'Eliminar Cuenta',
    delete_message: 'Esto eliminar\u00E1 permanentemente tu cuenta y todos tus datos. No se puede deshacer.',
    delete_confirm_title: '\u00BFEst\u00E1s completamente seguro?',
    delete_confirm_message: 'Todas tus descripciones, votos y estad\u00EDsticas desaparecer\u00E1n para siempre.',
    delete_error: 'Error al eliminar la cuenta. Int\u00E9ntalo de nuevo.',
  },

  // Share card
  share: {
    todays_word: 'LA PALABRA DE HOY',
    rank: 'PUESTO',
    votes: 'VOTOS',
    streak: 'RACHA',
    play_daily: '\u00A1Juega OneWord cada d\u00EDa!',
  },

  // Friends
  friends: {
    tab_title: 'Amigos',
    requests: 'Solicitudes de amistad',
    today_title: 'C\u00F3mo lo describieron tus amigos',
    play_first: 'Juega la palabra de hoy para ver las descripciones de tus amigos',
    locked: 'Juega primero para revelar',
    hasnt_played: 'A\u00FAn no ha jugado hoy',
    your_friends: 'Tus Amigos',
    add: 'A\u00F1adir',
    add_friends: 'A\u00F1adir Amigos',
    search_placeholder: 'Buscar por nombre de usuario',
    pending: 'Pendiente...',
    already_friends: 'Amigos',
    remove: 'Eliminar',
    remove_confirm: '\u00BFEliminar este amigo?',
    remove_confirm_title: 'Eliminar Amigo',
    accept: 'Aceptar',
    decline: 'Rechazar',
    empty_title: 'A\u00F1ade amigos para ver c\u00F3mo describen la palabra de hoy',
    empty_subtitle: 'Compara descripciones y compite con tu c\u00EDrculo',
    no_requests: 'No hay solicitudes pendientes',
    max_friends: 'Puedes tener hasta 50 amigos',
    today_word: 'Hoy: {{word}}',
  },

  // Results tabs
  results_tabs: {
    global: 'Global',
    friends: 'Amigos',
  },

  // Errors
  errors: {
    generic: 'Algo sali\u00F3 mal. Int\u00E9ntalo de nuevo.',
    network: 'Sin conexi\u00F3n a internet',
    network_retry: 'No se pudo conectar. Revisa tu internet.',
    load_word: 'No se pudo cargar la palabra de hoy',
    load_results: 'No se pudieron cargar los resultados',
    load_friends: 'No se pudieron cargar los amigos',
    submit_failed: 'No se pudo enviar. Int\u00E9ntalo de nuevo.',
    vote_failed: 'No se pudo guardar el voto. Reintentando...',
    friend_request_failed: 'No se pudo enviar la solicitud',
    search_failed: 'B\u00FAsqueda no disponible ahora',
    try_again: 'Reintentar',
    delete_confirm: '\u00BFEst\u00E1s seguro? Esto eliminar\u00E1 permanentemente tu cuenta y todos tus datos. No se puede deshacer.',
    delete_type_username: 'Escribe tu nombre de usuario para confirmar',
    logout_confirm: '\u00BFSeguro que quieres cerrar sesi\u00F3n?',
    max_friends: 'Has alcanzado el l\u00EDmite de amigos (50)',
    username_taken: 'Este nombre de usuario ya est\u00E1 en uso',
    invalid_email: 'Introduce un correo v\u00E1lido',
    password_short: 'La contrase\u00F1a debe tener al menos 6 caracteres',
    wrong_credentials: 'Correo o contrase\u00F1a incorrectos',
  },

  // Loading
  loading: {
    word: 'Cargando la palabra de hoy...',
    results: 'Cargando resultados...',
    submitting: 'Enviando...',
    generic: 'Cargando...',
  },

  // Empty states
  empty: {
    no_word: 'No hay palabra hoy',
    no_word_sub: '\u00A1Vuelve ma\u00F1ana!',
    no_results: 'Los resultados a\u00FAn no est\u00E1n listos',
    no_results_sub: '\u00A1Sigue votando para ayudar a clasificar!',
    no_descriptions: 'A\u00FAn no hay descripciones',
    no_descriptions_sub: '\u00A1S\u00E9 el primero en jugar la palabra de hoy!',
    no_friends_played: 'Ninguno de tus amigos ha jugado hoy',
    vote_complete: '\u00A1Votaste en {{count}} pares hoy!',
    no_pairs: 'A\u00FAn no hay suficientes descripciones. Vuelve m\u00E1s tarde.',
  },

  // Success messages
  success: {
    vote_saved: '\u00A1Voto guardado!',
    friend_sent: '\u00A1Solicitud enviada!',
    friend_request_subtitle: '@{{username}} verá tu solicitud',
    friend_accepted: '\u00A1Amigo a\u00F1adido!',
    description_submitted: '\u00A1Registrado!',
    account_deleted: 'Cuenta eliminada',
  },

  // Language names
  lang: {
    en: 'English',
    es: 'Espa\u00F1ol',
  },
};
