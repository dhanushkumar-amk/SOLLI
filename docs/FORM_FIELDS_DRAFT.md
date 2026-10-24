# Preliminary form fields

> **DRAFT. Must be replaced by the exact fields of the real blank form in Phase 4.** These are typical fields only and do not claim to match any specific state's official form.

| Field ID | English label | Tamil label | Type | Validation rule | Example spoken answer in Tamil-English |
|---|---|---|---|---|---|
| applicant_name | Applicant name | விண்ணப்பதாரர் பெயர் | text | Required; operator confirms spelling. | “En peyar Meena Krishnan.” |
| parent_spouse_name | Father/Husband name | தந்தை/கணவர் பெயர் | text | Required; operator confirms spelling. | “Appa peru Ramasamy.” |
| date_of_birth | Date of birth | பிறந்த தேதி | date | Parseable date; confirm verbally. | “En date of birth 12 March 1954.” |
| nominee | Nominee name | நியமனதாரர் பெயர் | text | Optional unless the real form requires it; confirm spelling. | “Nominee en magal Kavitha.” |
| gender | Gender | பாலினம் | choice | One of values TBD in Phase 4. | “Female.” |
| address | Address | முகவரி | text | Required; read back for confirmation. | “12, Lake Road, Periya Nagar.” |
| village | Village | கிராமம் | text | Required. | “Village Kovilpatti.” |
| taluk | Taluk | தாலுகா | text | Required. | “Taluk Ambasamudram.” |
| district | District | மாவட்டம் | text | Required. | “District Tirunelveli.” |
| phone | Phone number | தொலைபேசி எண் | phone | Digits only; length rule TBD in Phase 4. | “Phone number 98765 43210.” |
| bank_account | Bank account number | வங்கி கணக்கு எண் | number | Digits only; confirmation required; exact rule TBD in Phase 4. | “Account number 1234 5678 9012.” |
| aadhaar | Aadhaar number | ஆதார் எண் | number | Fake demo data only; no verification; exact rule TBD in Phase 4. | “Demo Aadhaar 1234 5678 9012.” |
