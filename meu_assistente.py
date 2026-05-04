from __future__ import annotations

import hmac
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import streamlit as st
from dotenv import load_dotenv

from dados_operacionais import CHECKLISTS, MANUAL_IA, MANUAIS, ROTEIRO_IA

try:
    from google import genai
    from google.genai import types

    SDK_GEMINI = "google-genai"
except ImportError:  # Compatibilidade temporaria com a biblioteca antiga.
    import google.generativeai as genai_legacy

    SDK_GEMINI = "google-generativeai"


load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
CHAVE_API = os.getenv("GEMINI_API_KEY") or os.getenv("CHAVE_API")
SENHA_CORRETA = os.getenv("SENHA_ACESSO")
MODELO_GEMINI = os.getenv("MODELO_GEMINI", "gemini-2.5-flash")
SESSAO_MINUTOS = int(os.getenv("SESSAO_MINUTOS", "480"))
MAX_TENTATIVAS_LOGIN = int(os.getenv("MAX_TENTATIVAS_LOGIN", "5"))
BLOQUEIO_LOGIN_SEGUNDOS = int(os.getenv("BLOQUEIO_LOGIN_SEGUNDOS", "120"))
MAX_MENSAGENS_CONTEXTO = int(os.getenv("MAX_MENSAGENS_CONTEXTO", "8"))


st.set_page_config(page_title="Dashboard Grupo Lia", page_icon="🍔", layout="wide")


def aplicar_estilo() -> None:
    st.markdown(
        """
        <style>
        .stApp { background: linear-gradient(180deg, #1A050A 0%, #380A15 100%); }

        [data-testid="stSidebar"] {
            background-color: #2D0811 !important;
            border-right: 2px solid #CC2936;
            text-align: center;
        }

        [data-testid="stSidebar"] [data-testid="stImage"] {
            display: flex;
            justify-content: center;
            margin-bottom: 18px;
            border-radius: 8px;
        }

        .stTabs [data-baseweb="tab-list"] {
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .stTabs [data-baseweb="tab"] {
            background-color: rgba(255,255,255,0.06);
            border-radius: 8px 8px 0 0;
            padding: 10px 24px;
            color: #FBF6E9;
        }

        .stTabs [aria-selected="true"] {
            background-color: #CC2936 !important;
            font-weight: 700;
        }

        .lia-metric {
            border: 1px solid rgba(251, 246, 233, 0.16);
            border-radius: 8px;
            padding: 12px 14px;
            background: rgba(255,255,255,0.04);
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def validar_configuracao() -> None:
    faltando = []
    if not CHAVE_API:
        faltando.append("GEMINI_API_KEY ou CHAVE_API")
    if not SENHA_CORRETA:
        faltando.append("SENHA_ACESSO")

    if faltando:
        st.error("Configuração incompleta. Defina: " + ", ".join(faltando))
        st.info("Use o arquivo .env.example como modelo para configurar o ambiente.")
        st.stop()


def inicializar_estado() -> None:
    padroes: dict[str, Any] = {
        "autenticado": False,
        "login_tentativas": 0,
        "login_bloqueado_ate": None,
        "autenticado_em": None,
        "mensagens": [],
    }
    for chave, valor in padroes.items():
        st.session_state.setdefault(chave, valor)


def encerrar_sessao() -> None:
    for chave in ("autenticado", "autenticado_em", "mensagens"):
        if chave in st.session_state:
            del st.session_state[chave]
    inicializar_estado()
    st.rerun()


def sessao_expirada() -> bool:
    autenticado_em = st.session_state.get("autenticado_em")
    if not autenticado_em:
        return False
    return datetime.now() - autenticado_em > timedelta(minutes=SESSAO_MINUTOS)


def senha_confere(senha: str) -> bool:
    return bool(SENHA_CORRETA) and hmac.compare_digest(senha, SENHA_CORRETA)


def renderizar_login() -> None:
    bloqueado_ate = st.session_state.get("login_bloqueado_ate")
    bloqueado = bloqueado_ate and datetime.now() < bloqueado_ate

    col1, col2, col3 = st.columns([1, 1.5, 1])
    with col2:
        st.markdown("<h1 style='text-align:center;'>🔑 Grupo Lia</h1>", unsafe_allow_html=True)
        st.caption("Acesso operacional interno")

        if bloqueado:
            segundos = int((bloqueado_ate - datetime.now()).total_seconds())
            st.warning(f"Muitas tentativas incorretas. Aguarde {segundos}s para tentar novamente.")
            st.stop()

        senha = st.text_input("Senha de acesso", type="password")
        if st.button("Entrar no sistema", use_container_width=True):
            if senha_confere(senha):
                st.session_state.autenticado = True
                st.session_state.autenticado_em = datetime.now()
                st.session_state.login_tentativas = 0
                st.session_state.login_bloqueado_ate = None
                st.rerun()

            st.session_state.login_tentativas += 1
            tentativas_restantes = MAX_TENTATIVAS_LOGIN - st.session_state.login_tentativas
            if tentativas_restantes <= 0:
                st.session_state.login_bloqueado_ate = datetime.now() + timedelta(
                    seconds=BLOQUEIO_LOGIN_SEGUNDOS
                )
                st.error("Acesso bloqueado temporariamente por excesso de tentativas.")
            else:
                st.error(f"Senha inválida. Tentativas restantes: {tentativas_restantes}.")
    st.stop()


def criar_prompt(pergunta: str) -> str:
    historico = st.session_state.mensagens[-MAX_MENSAGENS_CONTEXTO:]
    linhas = ["Base operacional do Grupo Lia:", MANUAL_IA, "", "Histórico recente:"]

    for mensagem in historico:
        papel = "Funcionário" if mensagem["role"] == "user" else "Assistente"
        linhas.append(f"{papel}: {mensagem['content']}")

    linhas.extend(["", f"Pergunta atual: {pergunta}"])
    return "\n".join(linhas)


def gerar_resposta_ia(pergunta: str) -> str:
    prompt = criar_prompt(pergunta)

    if SDK_GEMINI == "google-genai":
        client = genai.Client(api_key=CHAVE_API)
        resposta = client.models.generate_content(
            model=MODELO_GEMINI,
            contents=prompt,
            config=types.GenerateContentConfig(system_instruction=ROTEIRO_IA),
        )
        return resposta.text or "Não consegui gerar uma resposta agora."

    genai_legacy.configure(api_key=CHAVE_API)
    modelo = genai_legacy.GenerativeModel(MODELO_GEMINI, system_instruction=ROTEIRO_IA)
    resposta = modelo.generate_content(prompt)
    return resposta.text or "Não consegui gerar uma resposta agora."


def renderizar_sidebar() -> None:
    with st.sidebar:
        st.markdown("## 🏢 Painel")
        st.caption("Grupo Lia")
        st.divider()

        logos = [
            BASE_DIR / "assets" / "logo_burger.png",
            BASE_DIR / "assets" / "logo_salgados.png",
            BASE_DIR / "assets" / "logo_pizza.png",
        ]
        imagens_carregadas = False
        for caminho_imagem in logos:
            if caminho_imagem.exists():
                st.image(str(caminho_imagem), width=118)
                imagens_carregadas = True

        if not imagens_carregadas:
            st.warning("Imagens não encontradas. Verifique a pasta assets.")

        st.divider()
        st.caption(f"Sessão: {SESSAO_MINUTOS} min | IA: {MODELO_GEMINI}")
        if st.button("🚪 Encerrar turno", use_container_width=True):
            encerrar_sessao()


def renderizar_chat() -> None:
    st.markdown("<h2 style='text-align: center;'>Assistente Operacional Lia</h2>", unsafe_allow_html=True)
    st.caption("Use para dúvidas de preparo, atendimento, fechamento, padronização e treinamento.")

    for mensagem in st.session_state.mensagens:
        with st.chat_message(mensagem["role"]):
            st.markdown(mensagem["content"])

    pergunta = st.chat_input("Dúvida técnica ou operacional?")
    if not pergunta:
        return

    st.session_state.mensagens.append({"role": "user", "content": pergunta})
    with st.chat_message("user"):
        st.markdown(pergunta)

    with st.chat_message("assistant"):
        try:
            resposta = gerar_resposta_ia(pergunta)
            st.markdown(resposta)
            st.session_state.mensagens.append({"role": "assistant", "content": resposta})
        except Exception as erro:
            st.error("Não consegui consultar a IA agora.")
            st.warning("Confira a chave de API, conexão, cota do Gemini e tente novamente em instantes.")
            st.caption(f"Detalhe técnico: {erro}")


def renderizar_manuais() -> None:
    st.header("📚 Livro de Procedimentos")
    escolha = st.selectbox("Selecione a unidade", list(MANUAIS.keys()))
    manual = MANUAIS[escolha]

    st.subheader(manual["titulo"])
    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown(f"<div class='lia-metric'><strong>Temperatura</strong><br>{manual['temperatura']}</div>", unsafe_allow_html=True)
    with col2:
        st.markdown(f"<div class='lia-metric'><strong>Tempo padrão</strong><br>{manual['tempo']}</div>", unsafe_allow_html=True)
    with col3:
        st.markdown(f"<div class='lia-metric'><strong>Ponto crítico</strong><br>{manual['ponto_critico']}</div>", unsafe_allow_html=True)

    st.divider()
    for secao, itens in manual["procedimentos"].items():
        st.markdown(f"### {secao}")
        for item in itens:
            st.write(f"- {item}")

    st.info(manual["dica"])


def renderizar_checklist_grupo(nome_grupo: str, grupos: dict[str, list[str]]) -> None:
    st.header(nome_grupo)
    for titulo, itens in grupos.items():
        st.subheader(titulo)
        for indice, item in enumerate(itens):
            chave = f"{nome_grupo}-{titulo}-{indice}"
            st.checkbox(item, key=chave)
        st.divider()


def renderizar_tarefas() -> None:
    abas = st.tabs(list(CHECKLISTS.keys()))
    for aba, (nome_grupo, grupos) in zip(abas, CHECKLISTS.items()):
        with aba:
            renderizar_checklist_grupo(nome_grupo, grupos)


aplicar_estilo()
validar_configuracao()
inicializar_estado()

if st.session_state.autenticado and sessao_expirada():
    st.warning("Sua sessão expirou. Entre novamente para continuar.")
    encerrar_sessao()

if not st.session_state.autenticado:
    renderizar_login()

renderizar_sidebar()

aba_chat, aba_manuais, aba_tarefas = st.tabs(
    ["💬 Consultoria IA", "📚 Manuais Técnicos", "📋 Tarefas"]
)

with aba_chat:
    renderizar_chat()

with aba_manuais:
    renderizar_manuais()

with aba_tarefas:
    renderizar_tarefas()
