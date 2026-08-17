# Vardiya Planı

Küçük mağazalar için hazırlanmış sade bir haftalık vardiya planlama uygulamasıdır. Android, iPhone ve web önizlemesinde aynı Expo/React Native kodu çalışır.

## Özellikler

- Sabah, Öğlen, Full ve İzin vardiyaları
- Mola düşülerek otomatik net çalışma süresi hesabı
- Haftada bir izin ve kişi başı yaklaşık 45 saat hedefi
- Açılış ve kapanışta en az iki personel kontrolü
- Kesin ve tercih edilen izin talepleri
- Personel bazında çalışılabilecek vardiya seçimi
- Geçmiş haftaları dikkate alan dengeli vardiya dağılımı
- Dokunarak manuel vardiya değiştirme ve kural uyarıları
- Personel ekleme, düzenleme ve silme
- Vardiya saatlerini ve mola süresini değiştirme
- Verileri cihazda kalıcı saklama

## Çalıştırma

Bilgisayarda Node.js kurulu olmalıdır.

```powershell
npm.cmd install
npm.cmd start
```

Terminalde çıkan QR kodu Expo Go ile tarayarak telefonda açabilirsiniz. Android emülatörü için `a`, web önizlemesi için `w` tuşuna basılabilir.

Doğrudan komutlar:

```powershell
npm.cmd run android
npm.cmd run web
```

Web sürümünün yayın paketi:

```powershell
npm.cmd run build:web
```

## Kontroller

```powershell
npm.cmd run typecheck
npm.cmd test
```

## Planlama mantığı

Otomatik oluşturucu rastgele seçim yapmaz. Önce izin günlerinin olası dağılımlarını çıkarır, ardından günlük açılış/kapanış şartlarını sağlayan vardiya seçeneklerini karşılaştırır. Haftalık saate yakınlık, Sabah/Öğlen/Full dengesi, geçmiş haftalar, izin öncesi Sabah, izin sonrası Öğlen ve art arda Full çalışmama tercihleri birlikte puanlanır. Kurallar birlikte sağlanamıyorsa sessizce hatalı plan oluşturmak yerine nedeni gösterilir.

## Veri saklama

Personeller, izinler, ayarlar ve haftalık planlar yalnızca cihazdaki uygulama depolamasında tutulur. Sunucu, kullanıcı hesabı veya bulut senkronizasyonu yoktur.
