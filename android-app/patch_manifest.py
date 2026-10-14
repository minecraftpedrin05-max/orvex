# Deixa o app abrir pelo link orvex://auth (volta do login do Google feito no Chrome).
p = 'android/app/src/main/AndroidManifest.xml'
s = open(p, encoding='utf-8').read()
f = ('<intent-filter><action android:name="android.intent.action.VIEW"/><category android:name="android.intent.category.DEFAULT"/>'
     '<category android:name="android.intent.category.BROWSABLE"/><data android:scheme="orvex" android:host="auth"/></intent-filter>')
if 'android:scheme="orvex"' not in s:
    assert '</activity>' in s
    s = s.replace('</activity>', f + '</activity>', 1)
open(p, 'w', encoding='utf-8').write(s)
print('manifest ok')
