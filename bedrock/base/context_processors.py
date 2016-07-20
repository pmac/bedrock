# from bedrock.base

from django.conf import settings

from lib.l10n_utils import translation


def i18n(request):
    return {
        'LANGUAGES': settings.LANGUAGES,
        'LANG': (settings.LANGUAGE_URL_MAP.get(translation.get_language()) or
                 translation.get_language()),
        'DIR': 'rtl' if translation.get_language_bidi() else 'ltr',
    }


def globals(request):
    print 'ran the globals context processor'
    return {
        'request': request,
        'settings': settings,
    }
