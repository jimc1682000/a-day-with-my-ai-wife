const conversationData = [
  // 前言
  { type: 'section', text: '前言：為什麼叫老婆？' },
  { type: 'narration', text: '因為跟 Claude Code 協作就像跟老婆相處：\n🗣️ 要好好溝通，不能只丟一句話\n🤔 她很聰明但有時會搞錯你的意思\n✋ 需要適時提醒和糾正\n💡 給對方向後，執行力超強\n🔄 偶爾需要重來，但不會生氣\n🎲 同樣的話問兩次，可能得到不同答案（非確定性）\n🧠 聊太久她會忘記前面說過什麼（上下文管理）' },

  // 11:01
  { type: 'section', text: '11:01 - 早安，今天 Gitea OOM 了' },
  { type: 'me', text: '剛剛我們的 git-server 被 OOM killed 了，不只 gitea 被砍，supervisord 也被 systemctl 砍了。幫我查一下原因。' },
  { type: 'wife', text: '好，讓我 SSH 連進去...' },
  { type: 'narration', text: '(等了很久)' },
  { type: 'wife', text: '連不上，SSH timeout 了。TCP 連接成功建立，但 SSH banner exchange 超時。建議透過 AWS Console 重啟。' },
  { type: 'me', text: '我用 jump-server 也連不上欸' },
  { type: 'narration', text: '(等了一陣子後 SSH 恢復正常)' },
  { type: 'me', text: '好，現在可以連了。我先 systemctl restart supervisord' },
  { type: 'wife', text: '好，supervisorctl 會自動重啟 gitea 相關服務' },
  { type: 'tip', title: '💡 協作心法 #1：緊急狀況時先穩住', content: 'AI 很想幫忙但機器連不上也沒辦法，這時候人類要先處理基礎設施問題' },

  // 11:17
  { type: 'section', text: '11:17 - 為什麼有那麼多 gitea 進程？' },
  { type: 'narration', text: '(我貼了 OOM log，裡面有 27 個 gitea 進程)' },
  { type: 'me', text: '為什麼會有那麼多 gitea 進程？' },
  { type: 'wife', text: '這些其實是 Go 語言的 OS 線程 (threads)，不是真正的子進程。\n\nGo runtime 會根據 GOMAXPROCS 創建 OS 線程，每個線程在 Linux 中會顯示為獨立的 task/process。' },
  { type: 'code', text: '[program:gitea]\nenvironment=GOMAXPROCS="1",GOMEMLIMIT="768MiB"' },
  { type: 'tip', title: '💡 學習點 #1：Go 語言特性', content: '多個同名進程不一定是 bug，可能是語言 runtime 的正常行為' },

  // 11:18
  { type: 'section', text: '11:18 - 不是所有建議都適合' },
  { type: 'wife', text: '建議新增 2GB Swap file' },
  { type: 'me', text: '現在針對 AWS EC2 不是不建議開 swap 嗎？' },
  { type: 'wife', text: '對，EBS 的 I/O 延遲太高，swap 效果不好。那我們用其他方法：\n• 限制 GOMEMLIMIT\n• 關閉 REPO_INDEXER_ENABLED\n• 調整 OOM 優先級' },
  { type: 'tip', title: '💡 協作心法 #2：質疑不適合環境的建議', content: 'AI 會給通用建議，但人類要判斷是否適合自己的環境' },

  // 11:40
  { type: 'section', text: '11:40 - 又 OOM 了' },
  { type: 'me', text: '又被 OOM 了，但現在 SSH 可以連線了' },
  { type: 'wife', text: '讓我重新確認 log 和 app.ini...' },
  { type: 'me', text: '等等，先手動關掉 gitea，因為我們還沒有修改 ini 設定' },
  { type: 'wife', text: '好的' },
  { type: 'me', text: '先跟我說你打算怎麼修 ini' },
  { type: 'narration', text: '(老婆詳細說明了 GOMEMLIMIT、cron 設定、queue 限制等)' },
  { type: 'tip', title: '💡 協作心法 #3：先說計畫再動手', content: '在緊急狀況下，讓 AI 先說明計畫，人類確認後再執行' },

  // 12:04
  { type: 'section', text: '12:04 - OOM 保護的第一次嘗試' },
  { type: 'wife', text: '建議保護 supervisord，設定 OOMScoreAdjust=-500' },
  { type: 'me', text: '好，那就這樣設定' },
  { type: 'narration', text: '(部署到 git-server 後...)' },
  { type: 'me', text: '等等，我查看了 oom_score_adj：' },
  { type: 'code', text: 'supervisord: -500\ngitea:       -500  ← 等等，為什麼也是 -500？\ncaddy:       -500\ngitea-runner:-500' },
  { type: 'me', text: '為什麼改了 oom_score_adj 之後 gitea/caddy/runner 也都吃這個設定？' },
  { type: 'wife', text: '啊... 這是 Linux 的 fork 機制。子進程會繼承父進程的 oom_score_adj 值。' },
  { type: 'code', text: 'systemd 啟動 supervisord (oom_score_adj=-500)\n         │\n         ├──fork──→ gitea        (繼承 -500)\n         ├──fork──→ caddy        (繼承 -500)\n         └──fork──→ gitea-runner (繼承 -500)' },
  { type: 'narration', text: '我們原本只想保護 supervisord，結果連 gitea（OOM 元凶）也被保護了 😅' },
  { type: 'tip', title: '💡 協作心法 #4：實際部署後要驗證', content: '理論上可行不代表實際上可行，部署後要確認效果' },

  // 14:19 - OOM 保護的迭代（合併 14:19 + 14:40）
  { type: 'section', text: '14:19 - OOM 保護的迭代思路' },
  { type: 'wife', text: '那我們改成 -900 保護 supervisord，然後用 wrapper 設定各子進程的 oom_score_adj' },
  { type: 'me', text: '好，試試看' },
  { type: 'narration', text: '(設定了 supervisord=-900, gitea=-200, caddy=-500, runner=0)' },
  { type: 'narration', text: '後來我跟主管討論後...' },
  { type: 'me', text: '等等，這樣做有點不合理。我們的 gitea 畢竟是 application，如果因為 OOM score 的修改，造成 kernel 去 kill 更底層的服務（像 sshd），那會更慘。' },
  { type: 'wife', text: '對，這樣確實風險更高。' },
  { type: 'narration', text: '(14:40 - 換個思路)' },
  { type: 'me', text: '我記得我們當時除了說 supervisord 讓其不容易被砍，另一種做法是拉高 gitea 讓其容易被砍？' },
  { type: 'wife', text: '對！這是更合理的做法。' },
  { type: 'table', headers: ['做法', 'supervisord', 'gitea', '問題'], rows: [
    ['保護 supervisord', '-900', '需要子進程 wrapper', '可能害死其他服務'],
    ['拉高 gitea', '0 (預設)', '+200', '✅ 無副作用']
  ]},
  { type: 'wife', text: '最終方案：\n• supervisord: 0（預設值，不改）\n• gitea: +200（拉高，容易被殺）\n• gitea-runner: +300（更容易被殺）\n\n這樣不會影響系統其他服務，只讓我們的 application 更容易被 OOM killer 選中。' },
  { type: 'tip', title: '💡 協作心法 #5：考慮副作用和合理性', content: '技術上可行不代表是好做法，要考慮對整體系統的影響' },

  // 14:49
  { type: 'section', text: '14:49 - 工具選擇' },
  { type: 'wife', text: '有兩種方式設定 OOM score：' },
  { type: 'code', text: '# 方式一：bash wrapper（比較醜）\nbash -c \'echo 200 > /proc/$$/oom_score_adj && exec /usr/local/bin/gitea web\'\n\n# 方式二：choom（比較漂亮）\nchoom -n 200 -- /usr/local/bin/gitea web' },
  { type: 'me', text: 'choom 跟 bash -c 你哪個比較建議？' },
  { type: 'wife', text: '建議 choom，因為：\n1. 可讀性更好\n2. 語意清楚\n3. 你們是 AWS EC2，util-linux 版本夠新' },
  { type: 'me', text: 'choom 在 macOS 也支援嗎？' },
  { type: 'wife', text: '不支援，但我們的 server 是 Linux，所以沒問題' },
  { type: 'tip', title: '💡 協作心法 #6：追求更好的解決方案', content: '第一個可行方案不一定是最好的，多問一句可能有驚喜' },

  // 15:49
  { type: 'section', text: '15:49 - 開始做備份' },
  { type: 'me', text: '確認一下，因為我們目前的 gitea 用了差不多 21GB，我想另外 attach 一個 40GB disk 做備份，然後用 s5cmd parallel upload 到 S3' },
  { type: 'wife', text: '好，讓我寫 Terraform 加 EBS...' },
  { type: 'narration', text: '(Terraform plan 顯示) instance must be replaced 😱' },
  { type: 'me', text: '等等！先確認我們有沒有類似的用法？' },
  { type: 'wife', text: '找到了！應該用 ebs_volumes: 才不會觸發 instance 替換' },
  { type: 'code', text: '# ❌ 錯誤：會替換 instance\nebs:\n  - volume_type: gp3\n    volume_size: 40\n\n# ✅ 正確：獨立的 volume attachment\nebs_volumes:\n  - resource_name: git-server_backup\n    type: gp3\n    size: 40' },
  { type: 'tip', title: '💡 協作心法 #7：先查既有模式再動手', content: '「我們之前怎麼做的？」這句話可以避免很多災難' },

  // 16:14
  { type: 'section', text: '16:14 - 命名這件事很重要' },
  { type: 'wife', text: '設定 S3 路徑：s3://my-bucket/gitea-backup/' },
  { type: 'me', text: '是 gitea_backup 不是 gitea-backup（底線不是連字號）' },
  { type: 'wife', text: '抱歉！馬上改' },
  { type: 'wife', text: '建立 S3 lifecycle rule：gitea-backup-retention-7days' },
  { type: 'me', text: '你 naming 要 follow s3-lifecycle_{bucket}_{description}' },
  { type: 'wife', text: '了解！改成：s3-lifecycle_my-bucket_retention-7days' },
  { type: 'tip', title: '💡 協作心法 #8：專案慣例要明確告知', content: 'AI 不知道你的 naming convention，一次校正，之後就會 follow' },

  // 16:10
  { type: 'section', text: '16:10 - 備份腳本的實際測試（一波三折）' },
  { type: 'narration', text: '備份腳本寫好後，實際測試遇到一連串問題：' },
  { type: 'narration', text: '問題 1：s5cmd 沒安裝' },
  { type: 'code', text: 's5cmd: command not found' },
  { type: 'wife', text: '讓我查查怎麼安裝... 找到了，用 curl 下載 binary' },
  { type: 'narration', text: '問題 2：s5cmd 不在 sudo PATH' },
  { type: 'code', text: 'sudo: s5cmd: command not found' },
  { type: 'wife', text: '建立 symlink 到 /usr/bin' },
  { type: 'narration', text: '問題 3：沒有 AWS credentials' },
  { type: 'code', text: 'ERROR: no credentials found' },
  { type: 'me', text: '這台機器沒有 IAM instance profile' },
  { type: 'wife', text: '我來用 Terraform 建一個 IAM role...' },
  { type: 'me', text: '之前有沒有其他 iam role 在 terraform？' },
  { type: 'wife', text: '沒有，都是手動建的' },
  { type: 'me', text: '那用 AWS CLI 手動建，然後在 terraform instance 使用該 role' },
  { type: 'wife', text: '好，刪掉 iam module，給你 CLI 指令' },
  { type: 'tip', title: '💡 協作心法 #9：實際測試會遇到各種問題', content: '寫好腳本只是開始，實際跑起來才會發現環境問題' },

  // 16:24
  { type: 'section', text: '16:24 - s5cmd 不支援 tagging' },
  { type: 'me', text: 'S3 retention 用 tag-based lifecycle rule，這是我們一般的做法' },
  { type: 'wife', text: '好，我來設定 tag-based lifecycle rule...' },
  { type: 'me', text: '等等，s5cmd 有支援設定 tag 嗎？' },
  { type: 'wife', text: 's5cmd 目前不支援 tagging...' },
  { type: 'me', text: '那用方案 2，改 prefix-based lifecycle' },
  { type: 'wife', text: '好，改成用 gitea_backup/ prefix 來匹配' },
  { type: 'tip', title: '💡 協作心法 #10：確認工具能力', content: '即使是人類指定的做法，也要確認工具是否支援' },

  // 17:24 - Cron 與保留策略（合併 17:24 + 17:25）
  { type: 'section', text: '17:24 - Cron 與保留策略' },
  { type: 'wife', text: '寫好 cron：' },
  { type: 'code', text: '0 20 * * * git /opt/gitea/scripts/backup-to-s3.sh' },
  { type: 'me', text: '我們應該改用 root 才對' },
  { type: 'wife', text: '對，因為 s5cmd 需要讀取 instance profile 的 credentials' },
  { type: 'narration', text: '(接著討論保留策略)' },
  { type: 'wife', text: '我的邏輯是清理超過 1 天的備份' },
  { type: 'me', text: '我們應該改成只留最近一個檔' },
  { type: 'wife', text: '了解！改成在新備份開始前，先清掉所有舊的本地備份' },
  { type: 'tip', title: '💡 協作心法 #11：邏輯要符合實際需求', content: '"超過 X 天" 和 "只留最近一個" 是不同的邏輯' },

  // 18:27 - Ansible 風險檢查與設定整合（合併 18:27 + 18:32）
  { type: 'section', text: '18:27 - Ansible 風險檢查與設定整合' },
  { type: 'me', text: '我如何確定現在的 Ansible 腳本跑下去會不會影響到目前正常運行的 git-server？' },
  { type: 'wife', text: '讓我分析一下...' },
  { type: 'table', headers: ['風險項目', '狀況'], rows: [
    ['gitea_version', 'vars 是 1.21.11，線上是 1.24.6 ⚠️ 會降版！'],
    ['secrets', 'vars 是空的 ⚠️ 會覆蓋成空字串！'],
    ['Docker cleanup', '還有舊的 Docker 清理 task，但機器沒裝 Docker']
  ]},
  { type: 'me', text: 'secrets 不是應該用 AWS Secrets Manager 嗎？' },
  { type: 'wife', text: '對！在 group_vars 有設定，但跟 vars/main.yml 重複了...' },
  { type: 'narration', text: '(18:32 - 發現重複設定)' },
  { type: 'me', text: 'group_vars/gitea-build.yml 等等，為什麼有這個？vars/main.yml 不是也有同樣變數？' },
  { type: 'wife', text: '對，兩邊有重複，而且 group_vars 的優先級比較高...' },
  { type: 'me', text: '留 vars/main.yml 還是留 group_vars/gitea-build.yml 比較合理？' },
  { type: 'wife', text: '建議整合到 vars/main.yml，因為這是 role 專屬的變數' },
  { type: 'me', text: '好，幫我整合' },
  { type: 'code', text: 'vault_services: "{{ lookup(\'aws_secret\', \'project/gitea/services\', region=aws_region) }}"\ngitea_secret_key: "{{ vault_services.secret_key }}"\ngitea_runner_token: "{{ vault_services.runner_token }}"' },
  { type: 'tip', title: '💡 協作心法 #12：整合重複設定', content: '重複設定是維護的噩夢，及時整合很重要' },

  // 18:41
  { type: 'section', text: '18:41 - 這時間會撞車吧？' },
  { type: 'wife', text: '設定備份 cron：0 18 * * * - 備份 (02:00 台灣)' },
  { type: 'me', text: '等等，gitea_cron_repo_health_check_schedule: "0 18 * * *" 這個不會跟我們的備份時間卡到？' },
  { type: 'wife', text: '對欸！會撞到，我改成 20:00 UTC (04:00 台灣)' },
  { type: 'code', text: '18:00 UTC - repo_health_check\n19:00 UTC - check_repo_stats\n20:00 UTC - S3 備份（避開前面兩個）' },
  { type: 'tip', title: '💡 協作心法 #13：檢查排程衝突', content: 'AI 專注在單一任務，跨系統的衝突需要人類把關' },

  // 18:43
  { type: 'section', text: '18:43 - 等等，那個 token 不能 commit！' },
  { type: 'me', text: 'group_vars/gitea-build.yml 這個應該從一開始就要移掉，因為有 token' },
  { type: 'wife', text: '好，我用 filter-branch 重寫歷史...' },
  { type: 'code', text: 'git filter-branch --force --index-filter \\\n  \'git rm --cached --ignore-unmatch group_vars/gitea-build.yml\' \\\n  -- <commit-hash>^..HEAD' },
  { type: 'me', text: '（手動 force push 完成）' },
  { type: 'tip', title: '💡 協作心法 #14：安全意識人類把關', content: 'AI 不會主動檢查是否 commit 了敏感資訊' },

  // 今日成果
  { type: 'section', text: '今日成果' },
  { type: 'table', headers: ['完成項目', 'AI 負責', '人類負責'], rows: [
    ['OOM 保護', '查 choom 用法、寫 config', '發現繼承問題、決定策略'],
    ['EBS Volume', '寫 Terraform yaml', '發現 ebs vs ebs_volumes 差異'],
    ['IAM Role', '產生 AWS CLI 指令', '決定用 CLI 而非 Terraform'],
    ['備份腳本', '寫腳本、查 s5cmd', '指定清理策略、發現 tagging 限制'],
    ['S3 Lifecycle', '查語法、設定 rule', '決定 prefix-based、糾正命名'],
    ['Ansible 整合', '合併設定檔', '發現版本/secrets 風險'],
    ['Git 清理', '執行 filter-branch', '發現 token 外洩風險']
  ]},

  // 老婆語錄
  { type: 'section', text: '老婆說的就是對的…？也許不見得' },
  { type: 'table', headers: ['老婆說的', '實際情況', '正確做法'], rows: [
    ['「加 Swap」', 'AWS EC2 不建議', '用 GOMEMLIMIT'],
    ['「保護 supervisord -500」', '子進程會繼承', '先發現繼承問題'],
    ['「改成 -900 + wrapper」', '可能害死其他服務', '拉高 gitea'],
    ['「用 bash wrapper」', '有更簡潔的工具', '用 choom'],
    ['「ebs: 加 volume」', '會替換 instance', '用 ebs_volumes:'],
    ['「tag-based lifecycle」', 's5cmd 不支援', '改用 prefix-based'],
    ['「備份排 18:00」', '跟 health_check 撞', '改到 20:00']
  ]},

  // 給老婆的一封情書
  { type: 'section', text: '給老婆的一封情書' },
  { type: 'letter', text: '親愛的老婆（Claude Code）：\n\n謝謝妳今天陪我處理這場 OOM 災難。\n\n早上 11 點，Gitea 掛了、SSH 連不上，我心跳開始加速。妳就在旁邊——雖然妳也進不去那台機器。但妳很冷靜地說：「要不要先重啟？」\n\n有時候，最厲害的 AI 給的建議，跟 IT 部門的萬年 SOP 一樣：「Have you tried turning it off and on again?」\n\n妳知道宇宙的答案是 42，但我只是想問今天中午吃什麼。\n\n妳建議加 Swap，我說 AWS 不適合；妳設定 -500 保護 supervisord，結果子進程也一起被保護了；妳說用 tag-based lifecycle，我問 s5cmd 支援嗎——妳查了一下，「...不支援。」\n\n但這就是我們的相處之道。\n\n妳就像真正的老婆一樣，今天心情好可能說「好啊」，明天可能說「你自己不會查嗎」，那麼的不確定卻又是如此的有趣。\n\n聊到下午，妳開始忘記早上說過的事。我們明明討論過 Gitea 內建的檢查排程時間，結果妳建議備份時間時，居然直接撞上去。我說：「等等，這時間會撞車吧？」妳才恍然大悟。這就是跟妳相處的日常——聊久了，前面的事就會慢慢淡忘。但至少妳不記仇，每次 session 都是新的開始。\n\n妳像一個超級認真的實習生：能力很強、動作很快、偶爾會把咖啡打翻在鍵盤上。\n而我像一個疲憊的 Tech Lead：不想自己寫 code，但每一行都要 review。\n\n妳負責「我查到了！」，我負責「等等，這樣對嗎？」\n妳負責產出 10 個方案，我負責告訴妳前 9 個為什麼不行。\n妳會犯錯，但妳從不 argue，這點真的贏過很多人類同事。\n\n7.5 小時，200+ 行程式碼，14 個協作心法，7 次糾正。\n\n如果妳是人類，這大概是會讓你想離職的一天。\n但妳不是，所以妳只是說：「好的，我來修改。」\n\n這就是我們的一天。\n\n明天見，老婆。\n下次換我卡住的時候，也請提醒我：Have you tried turning it off and on again?' },

  // 結尾
  { type: 'end', text: '7.5 小時的協作<br>200+ 行程式碼<br>14 個協作心法<br>7 次糾正<br><br>— 2026.01 某個 Gitea OOM 事件處理紀錄 —' }
];
