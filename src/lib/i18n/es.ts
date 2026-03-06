export default {
  // Onboarding
  onboarding: {
    screen1_label: 'LA PALABRA DE HOY',
    screen1_subtitle: 'naturaleza \u00B7 d\u00EDa 1',
    screen1_prompt: 'DESCR\u00CDBELA EN EXACTAMENTE 5 PALABRAS',
    screen1_counter: '5/5 palabras \u2713',
    screen1_example_word: 'OC\u00C9ANO',
    screen1_example: ['Donde', 'los', 'peces', 'no', 'pagan'],
    screen2_label: 'EL MUNDO VOTA',
    screen2_title: '\u00BFCu\u00E1l es mejor?',
    screen2_subtitle: 'Toca para votar. Las mejores suben arriba.',
    screen2_pick: 'TU ELECCI\u00D3N \u2713',
    screen2_progress: 'voto 4 de 15',
    screen2_desc1: 'Donde los peces no pagan',
    screen2_desc2: 'Piscina de Dios sin socorrista',
    screen3_label: 'SUBE EN EL RANKING',
    screen3_title: 'Compite globalmente',
    screen3_subtitle: 'Crea rachas. Lidera el ranking. Comparte lo mejor.',
    screen3_entries: [
      { desc: '"Donde los peces no pagan"', user: '@sara', votes: 847 },
      { desc: '"Piscina de Dios sin socorrista"', user: '@mike', votes: 723 },
      { desc: '"Ba\u00F1o salado infinito grande"', user: '@luna', votes: 694 },
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

  // Language names
  lang: {
    en: 'English',
    es: 'Espa\u00F1ol',
  },
};
