#!/bin/sh
# Test de l'APK dans un téléphone Android virtuel (lancé par le workflow « DedCut Android »).
# Installe l'APK, ouvre DedCut, attend, prend des captures d'écran, lit les textes affichés et garde le journal Android.
APK="$1"; OUT="$2"; PKG=com.bykemi.dedcut
mkdir -p "$OUT"
adb install -r "$APK" > "$OUT/installation.txt" 2>&1
adb logcat -c
adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1
vivant() { if adb shell ps -A | grep -q "$PKG\$"; then echo "oui"; else echo "non"; fi; }
sleep 10; echo "vivant à 10 s : $(vivant)" > "$OUT/suivi.txt"
sleep 15; echo "vivant à 25 s : $(vivant)" >> "$OUT/suivi.txt"
adb exec-out screencap -p > "$OUT/android-demarrage.png"
sleep 20; echo "vivant à 45 s : $(vivant)" >> "$OUT/suivi.txt"
adb exec-out screencap -p > "$OUT/android-apres-45s.png"
# appli au premier plan (texte), processus, et textes lus à l'écran (la page de DedCut est lisible par l'accessibilité)
adb shell dumpsys window | grep -E "mCurrentFocus|mFocusedApp" > "$OUT/premier-plan.txt" 2>&1
adb shell ps -A | grep -i dedcut > "$OUT/processus.txt" 2>&1
adb shell uiautomator dump /sdcard/ecran.xml > /dev/null 2>&1
adb pull /sdcard/ecran.xml "$OUT/ecran.xml" > /dev/null 2>&1
grep -o 'text="[^"]\{2,\}"' "$OUT/ecran.xml" 2>/dev/null | sed 's/text="//;s/"$//' | head -40 > "$OUT/textes-ecran.txt"
adb logcat -d > "$OUT/journal-android.txt" 2>&1
grep -iE "FATAL|Fatal signal|panicked|AndroidRuntime|has died|Start proc .*$PKG|Displayed $PKG|chromium.*(error|Uncaught)" "$OUT/journal-android.txt" | tail -80 > "$OUT/journal-erreurs.txt"

if grep -q "Success" "$OUT/installation.txt"; then echo "| L'APK s'installe | ✅ | |"; else echo "| L'APK s'installe | ❌ | $(tail -1 "$OUT/installation.txt") |"; fi > "$OUT/android.md"
if grep -q "$PKG" "$OUT/premier-plan.txt"; then echo "| DedCut est ouvert à l'écran après 45 s | ✅ | |"; else echo "| DedCut est ouvert à l'écran après 45 s | ❌ | $(head -1 "$OUT/premier-plan.txt" | tr -d '|') |"; fi >> "$OUT/android.md"
# intérieur de la page (APK de test : la page peut être inspectée), lu par scripts/android-cdp.mjs
P=$(awk '{print $2}' "$OUT/processus.txt" | head -1)
if [ -n "$P" ] && adb forward tcp:9222 localabstract:webview_devtools_remote_$P > /dev/null 2>&1; then
  node "$(dirname "$0")/android-cdp.mjs" 9222 >> "$OUT/android.md"
else
  echo "| Lecture de la page de DedCut | ❌ | débogage de la page introuvable |" >> "$OUT/android.md"
fi
cat "$OUT/android.md"
echo "----- premier plan / processus -----"; cat "$OUT/premier-plan.txt" "$OUT/processus.txt"
echo "----- textes lus à l'écran -----"; cat "$OUT/textes-ecran.txt"
echo "----- erreurs Android (journal) -----"; cat "$OUT/journal-erreurs.txt"
echo "----- suivi -----"; cat "$OUT/suivi.txt"
PID0=$(grep -o "Start proc [0-9]*:$PKG/" "$OUT/journal-android.txt" | head -1 | grep -o "[0-9]*")
echo "----- journal de DedCut (processus $PID0) et mémoire -----"
grep -E " $PID0 |lmkd|lowmemory|Killing|kill|Renderer|render process|RenderProcessGone|crash|WryActivity|$PKG" "$OUT/journal-android.txt" | grep -v "s_glBind\|AppsFilter\|ConnectivityService\|NetworkFactory" | tail -150
echo "----- fin -----"
