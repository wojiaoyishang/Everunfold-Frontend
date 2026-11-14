构建与发布文档
==============

文档使用 reStructuredText、Sphinx 与 Read the Docs 主题。首页
``docs/source/index.rst`` 使用 ``toctree`` 将入门、站点后台、开发参考、部署和发布说明分章。发布范围是 ``docs/source/`` 生成的 HTML。仓库内的旧 Markdown 设计记录和
开发交接留作查阅历史。

在本地预览
----------

在对应仓库根目录，用 Python 3.12 和独立文档环境运行以下命令。

.. code-block:: bash

   python3.12 -m venv .venv-docs
   .venv-docs/bin/python -m pip install -r docs/requirements.txt
   .venv-docs/bin/python docs/diagrams/render.py --check
   .venv-docs/bin/python -m sphinx -b html -d _build/doctrees -n -W docs/source _build/html
   .venv-docs/bin/python -m http.server 8080 --bind 127.0.0.1 --directory _build/html

在 Windows 使用 ``py -3.12 -m venv .venv-docs``，之后用
``.venv-docs\Scripts\python.exe`` 执行上述 Python 命令。浏览器打开
``http://127.0.0.1:8080/``。构建把 Sphinx 警告视为错误，可以在提交前发现
失效的交叉引用。打算在侧栏直接展示的专题放进首页相应分组的
``toctree``，子专题放在相关页面的 ``toctree`` 下。每个专题使用一个目录父页，
其他章节通过 ``:doc:`` 交叉引用。这样面包屑和上下页的顺序一致。

更新流程图
----------

``docs/diagrams/`` 下的 JSON 按顺序记录步骤。每步用 ``title`` 和
``detail`` 描述处理者、条件或可观察结果。可选的 ``transitions``
标注相邻步骤之间的条件，``branches`` 用从 1 开始的 ``from``
指向分支的起点。描述多条独立路径时可设 ``"layout": "lanes"``。

编辑数据后，从仓库根目录运行以下命令并将 JSON 和生成的 SVG 一起提交。
脚本只使用 Python 标准库，工作流会检查图像是否与数据一致。

.. code-block:: bash

   .venv-docs/bin/python docs/diagrams/render.py
   .venv-docs/bin/python docs/diagrams/render.py --check

在 RST 中用 ``figure`` 引用 ``/_static/diagrams/`` 下的 SVG，
设置替代文字并添加图注。正文保留完整步骤、分支和验收命令，便于搜索和
在小屏上逐条查阅。入门、站点后台和运维共用章节中的图，更新时需同步到两仓库。

配置 GitHub Pages
-----------------

两个仓库各自维护 ``.github/workflows/docs.yml``。有仓库设置权限的维护者需在
**Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
还在使用分支发布源时，切换到该选项即可。若仓库可见性或组织策略限制 GitHub Pages，
按仓库实际权限准备发布。

- 对 ``main`` 的文档变更 PR 执行严格构建，部署只在 ``main`` 进行。
- 文档变更合入 ``main`` 后，workflow 上传当次构建的 HTML，交给 GitHub Pages 部署。
- 首次配置可在 **Actions → Build and publish documentation** 从 ``main`` 手动运行，
  并在 ``github-pages`` 部署记录查看最终地址。

站点部署流程见 `GitHub Pages 自定义 workflow 指南
<https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>`__。
