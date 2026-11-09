"""Regenerate figures 7–9 from frozen, public local observations. No network."""
from pathlib import Path
import json, argparse, textwrap
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(); p.add_argument('--out', default=str(ROOT/'reports/react-figures')); args=p.parse_args()
OUT=Path(args.out); OUT.mkdir(parents=True, exist_ok=True)
DATA=ROOT/'study/react-practices-v0.2'; r=json.loads((DATA/'observations.json').read_text()); exp=r['reactExperiment']
plt.rcParams.update({'font.family':'DejaVu Sans', 'font.size':12, 'axes.spines.top':False, 'axes.spines.right':False, 'svg.fonttype':'none'})
NAVY='#173e55'; TEAL='#087f8c'; RED='#a3342b'; LIGHT='#edf5f7'
figures=[]
def save(fig, name, title, caption, alt):
    for ext in ['png','svg','pdf']:fig.savefig(OUT/(name+'.'+ext),dpi=300,facecolor='white',bbox_inches='tight')
    plt.close(fig); figures.append(dict(file=name,title=title,caption=caption,alt=alt))
fig,ax=plt.subplots(figsize=(10,5.8)); ax.set(xlim=(0,10),ylim=(0,6));ax.axis('off')
steps=[('1. Refinar','Jornada + estados\nCritérios de aceitação'),('2. Implementar','BP01 · Biblioteca / HTML\nBP06 · Skills e agentes'),('3. Verificar','BP02 · Lint\nBP03 · Teclado, foco e estados'),('4. CI','BP04 · Gate por política\nBP05 · Versões e artefatos'),('5. Revisar','BP07 · Evidências + decisão\nRevisão humana registrada'),('6. Acompanhar','Entrega conforme as regras\nMétricas de uso e negócio')]
pos=[(.2,3.4),(3.55,3.4),(6.9,3.4),(6.9,.6),(3.55,.6),(.2,.6)]
for (title,body),(x,y) in zip(steps,pos):
    ax.add_patch(FancyBboxPatch((x,y),2.9,1.65,boxstyle='round,pad=.08',fc=LIGHT,ec=NAVY,lw=1.3));ax.text(x+.15,y+1.23,title,color=NAVY,weight='bold',fontsize=14);ax.text(x+.15,y+.83,body,color=NAVY,va='top',fontsize=9.5,linespacing=1.6)
for a,b in [((3.15,4.2),(3.45,4.2)),((6.5,4.2),(6.8,4.2)),((8.35,3.25),(8.35,2.4)),((6.8,1.4),(6.5,1.4)),((3.45,1.4),(3.15,1.4))]:ax.annotate('',xy=b,xytext=a,arrowprops=dict(arrowstyle='->',color=TEAL,lw=2))
ax.text(.15,5.6,'Práticas propostas → evidências verificáveis',fontsize=19,color=NAVY,weight='bold')
ax.text(.15,.05,'Papéis podem ser exercidos pela mesma sessão; isso não constitui revisão independente.',fontsize=10,color=NAVY)
save(fig,'figura-07-praticas-react','Práticas React no ciclo de desenvolvimento','Figura 7. Mapa de práticas e evidências propostas para o ciclo ágil. Arquivos demonstram configuração; logs e artefatos demonstram execução no recorte; revisão humana exige registro próprio. Não houve medição de produtividade ou adoção em sprints. Fonte: protocolo do instrumento, v0.2.0.','Seis etapas: refinar, implementar, verificar, CI, revisar e acompanhar. Sete práticas vinculam biblioteca, lint, testes, gate, evidências, agentes e critérios de aceitação.')
fig,ax=plt.subplots(figsize=(10,4.8)); labels=['Corrigido\nfechado','Corrigido\nmodal aberto','Corrigido\nreserva confirmada','Controle negativo\nsem nome']; counts=[sum(v['nodeCount'] for v in s['accessibility']['violations']) for s in exp['states']]
ax.bar(range(4),counts,color=[TEAL]*3+[RED],width=.55);ax.set_xticks(range(4),labels);ax.set_ylabel('Ocorrências regra-elemento');ax.set_ylim(0,1.55);ax.set_yticks([0,1]);ax.set_title('Mesma biblioteca; integração e estados verificados',loc='left',color=NAVY,pad=25,fontsize=17)
for i,c in enumerate(counts):ax.text(i,c+.06,str(c),ha='center',weight='bold',color=NAVY,fontsize=16)
ax.text(.01,.92,'Gate dos três estados corrigidos: aprovado\nGate do controle negativo: reprovado (button-name)',transform=ax.transAxes,color=NAVY,va='top',fontsize=11)
fig.tight_layout()
save(fig,'figura-08-estados-react','Estados React e controle negativo','Figura 8. Experimento local React/Radix: três estados corrigidos sem alertas no recorte e um controle negativo com uma ocorrência crítica de button-name. Foram aprovadas 17 asserções correlacionadas de um único cenário, incluindo teclado e foco. A política rejeitou o controle negativo. Não é certificação WCAG nem evidência de conversão. Fonte: observações preservadas em study/react-practices-v0.2.','Contagens 0, 0, 0 e 1 nos estados fechado, modal aberto, confirmação e controle negativo. Mesmo componente e biblioteca; gate aprova o conjunto corrigido e reprova o controle negativo.')
fig=plt.figure(figsize=(10,10)); gs=fig.add_gridspec(3,2,height_ratios=[2.8,1.15,1.55],hspace=.38,wspace=.12)
views=r['visualComparisons'][0]
for col,key in enumerate(['before','after']):
    v=views[key];ax=fig.add_subplot(gs[0,col]);im=Image.open(DATA/(key+'.png'));ax.imshow(im.crop((280,280,1165,755)));ax.axis('off');ax.set_title('ANTES' if col==0 else 'DEPOIS',color=NAVY,fontsize=16,weight='bold',pad=14)
    ax.text(0,-.07,'Usuário: mesmo ícone e aparência',transform=ax.transAxes,color=NAVY,fontsize=11)
    ax=fig.add_subplot(gs[1,col]);ax.set_facecolor(LIGHT);ax.set_xticks([]);ax.set_yticks([])
    button=next(n for n in v['axRows'] if n['role']=='button');name=button['name'] or '[SEM NOME]'
    ax.text(.04,.86,'Tecnologia assistiva · recorte AX',va='top',transform=ax.transAxes,weight='bold',color=NAVY,fontsize=12)
    ax.text(.04,.56,'role: button\nname: '+name,va='top',transform=ax.transAxes,color=RED if col==0 else TEAL,fontsize=12,fontfamily='DejaVu Sans Mono')
    ax=fig.add_subplot(gs[2,col]);ax.set_facecolor(LIGHT);ax.set_xticks([]);ax.set_yticks([])
    ax.text(.04,.9,'Agente · canais observados',va='top',transform=ax.transAxes,weight='bold',color=NAVY,fontsize=12)
    txt=('HTML inicial: corpo sem texto\nDOM: produto, preço e tamanho\nMarcação: botão '+('sem aria-label' if col==0 else 'com aria-label')+'\nBusca por papel/nome: '+('0 alvos' if col==0 else '1 alvo'))
    ax.text(.04,.69,txt,va='top',transform=ax.transAxes,color=NAVY,fontsize=10.5,linespacing=1.8)
fig.suptitle('A correção semântica pode preservar a aparência',fontsize=19,color=NAVY,weight='bold',y=.98)
fig.text(.05,.04,'Capturas reais recortadas da área do produto. Diferença: 2 / 1.440.000 pixels; tolerância: 16.\nAX não é fala de leitor de tela; busca Playwright não é execução de um LLM.',fontsize=10,color=NAVY)
save(fig,'figura-09-visoes-antes-depois','Antes/depois por canal de observação','Figura 9. Antes e depois em três canais: captura visual real (recorte do produto), nome exposto na árvore AX e entradas disponíveis para agentes. A correção adiciona o nome do botão preservando a aparência: 2 pixels diferentes em 1.440.000 (limite: 16); o localizador Playwright por papel/nome passa de zero para um alvo. O exemplo utiliza renderização React no cliente: o HTML inicial não contém o texto do produto nas duas condições, enquanto o DOM renderizado o contém. Não houve execução de leitor de tela ou LLM. Fonte: experimento local reproduzível, v0.2.0.','Duas colunas, antes e depois. As imagens da camisa e do ícone são visualmente equivalentes, com duas diferenças de pixel registradas. A árvore AX muda de botão sem nome para botão Revisar seleção. O DOM mantém produto, preço e tamanho; o botão ganha aria-label. Um localizador pelo nome encontra zero alvos antes e um depois.')
(OUT/'legendas-react.json').write_text(json.dumps(figures,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'out':str(OUT),'figures':len(figures)}))
