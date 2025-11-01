import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface PortfolioWork {
  id: number;
  title: string;
  description: string;
  image_url: string;
  is_favorite: boolean;
}

export default function Index() {
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [works, setWorks] = useState<PortfolioWork[]>([]);
  const [favoriteWorks, setFavoriteWorks] = useState<PortfolioWork[]>([]);
  const [selectedWork, setSelectedWork] = useState<PortfolioWork | null>(null);
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newWorkDescription, setNewWorkDescription] = useState('');
  const [newWorkImage, setNewWorkImage] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState('gallery');
  const [showAddWorkDialog, setShowAddWorkDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedAdmin = localStorage.getItem('portfolioAdmin');
    if (storedAdmin === 'true') {
      setIsAdmin(true);
    }
    loadWorks();
  }, []);

  const loadWorks = () => {
    const savedWorks = localStorage.getItem('portfolioWorks');
    if (savedWorks) {
      setWorks(JSON.parse(savedWorks));
    } else {
      const mockWorks: PortfolioWork[] = [
        {
          id: 1,
          title: 'Проект 1',
          description: 'Описание первого проекта',
          image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=600&fit=crop',
          is_favorite: false,
        },
        {
          id: 2,
          title: 'Проект 2',
          description: 'Описание второго проекта',
          image_url: 'https://images.unsplash.com/photo-1634942537034-2531766767d1?w=800&h=600&fit=crop',
          is_favorite: false,
        },
        {
          id: 3,
          title: 'Проект 3',
          description: 'Описание третьего проекта',
          image_url: 'https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=800&h=600&fit=crop',
          is_favorite: false,
        },
      ];
      setWorks(mockWorks);
      localStorage.setItem('portfolioWorks', JSON.stringify(mockWorks));
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('portfolioAdmin');
    setFavoriteWorks([]);
    toast({
      title: 'Выход',
      description: 'Вы вышли из админ-панели',
    });
  };

  const toggleFavorite = (workId: number) => {
    setWorks((prevWorks) =>
      prevWorks.map((work) =>
        work.id === workId ? { ...work, is_favorite: !work.is_favorite } : work
      )
    );

    const work = works.find((w) => w.id === workId);
    if (work) {
      if (!work.is_favorite) {
        setFavoriteWorks((prev) => [...prev, { ...work, is_favorite: true }]);
        toast({
          title: 'Добавлено в избранное',
          description: work.title,
        });
      } else {
        setFavoriteWorks((prev) => prev.filter((w) => w.id !== workId));
        toast({
          title: 'Удалено из избранного',
          description: work.title,
        });
      }
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'Nastya29472') {
      setIsAdmin(true);
      setShowAdminPanel(false);
      localStorage.setItem('portfolioAdmin', 'true');
      setAdminPassword('');
      toast({
        title: 'Админ-панель',
        description: 'Доступ разрешен',
      });
    } else {
      toast({
        title: 'Ошибка',
        description: 'Неверный пароль',
        variant: 'destructive',
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setNewWorkImage(file);
    } else {
      toast({
        title: 'Ошибка',
        description: 'Выберите изображение',
        variant: 'destructive',
      });
    }
  };

  const handleAddWork = () => {
    if (!isAdmin) {
      toast({
        title: 'Ошибка',
        description: 'Только администратор может добавлять работы',
        variant: 'destructive',
      });
      return;
    }

    if (!newWorkTitle || !newWorkImage) {
      toast({
        title: 'Ошибка',
        description: 'Заполните название и выберите изображение',
        variant: 'destructive',
      });
      return;
    }

    const imageUrl = URL.createObjectURL(newWorkImage);
    const newWork: PortfolioWork = {
      id: works.length + 1,
      title: newWorkTitle,
      description: newWorkDescription,
      image_url: imageUrl,
      is_favorite: false,
    };

    const updatedWorks = [...works, newWork];
    setWorks(updatedWorks);
    localStorage.setItem('portfolioWorks', JSON.stringify(updatedWorks));
    setNewWorkTitle('');
    setNewWorkDescription('');
    setNewWorkImage(null);
    setShowAddWorkDialog(false);

    toast({
      title: 'Работа добавлена',
      description: newWork.title,
    });
  };

  const handleDeleteWork = (workId: number) => {
    if (!isAdmin) {
      toast({
        title: 'Ошибка',
        description: 'Только администратор может удалять работы',
        variant: 'destructive',
      });
      return;
    }

    const updatedWorks = works.filter((work) => work.id !== workId);
    setWorks(updatedWorks);
    localStorage.setItem('portfolioWorks', JSON.stringify(updatedWorks));
    setFavoriteWorks((prevFavorites) => prevFavorites.filter((work) => work.id !== workId));
    toast({
      title: 'Работа удалена',
      description: 'Работа успешно удалена из портфолио',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-2xl font-bold">Pro Portfolio</h1>
          <div className="flex items-center gap-4">
            {isAdmin ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowAddWorkDialog(true)}>
                  <Icon name="Plus" size={16} className="mr-2" />
                  Добавить работу
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <Icon name="LogOut" size={16} className="mr-2" />
                  Выйти из админки
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowAdminPanel(true)}>
                <Icon name="Shield" size={16} className="mr-2" />
                Админ-панель
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="gallery">Галерея</TabsTrigger>
            <TabsTrigger value="favorites">Избранное</TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {works.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <Icon name="ImageOff" size={64} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Пока нет работ</h3>
                  <p className="text-muted-foreground">
                    Войдите в админ-панель, чтобы добавить работы
                  </p>
                </div>
              ) : (
                works.map((work) => (
                  <Card
                    key={work.id}
                    className="group overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={work.image_url}
                        alt={work.title}
                        className="w-full h-full object-cover no-select"
                        onContextMenu={(e) => e.preventDefault()}
                        onClick={() => setSelectedWork(work)}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(work.id);
                        }}
                        className="absolute top-3 right-3 p-2 bg-background/80 backdrop-blur rounded-full transition-all hover:bg-background hover:scale-110"
                      >
                        <Icon
                          name="Heart"
                          size={20}
                          className={work.is_favorite ? 'fill-red-500 text-red-500' : 'text-foreground'}
                        />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWork(work.id);
                          }}
                          className="absolute top-3 left-3 p-2 bg-destructive/80 backdrop-blur rounded-full transition-all hover:bg-destructive hover:scale-110"
                        >
                          <Icon name="Trash2" size={20} className="text-white" />
                        </button>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-1">{work.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {work.description}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteWorks.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <Icon name="Heart" size={64} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Нет избранных работ</h3>
                  <p className="text-muted-foreground">
                    Нажмите на сердечко, чтобы добавить работу в избранное
                  </p>
                </div>
              ) : (
                favoriteWorks.map((work) => (
                  <Card
                    key={work.id}
                    className="group overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                    onClick={() => setSelectedWork(work)}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={work.image_url}
                        alt={work.title}
                        className="w-full h-full object-cover no-select"
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-1">{work.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {work.description}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!selectedWork} onOpenChange={() => setSelectedWork(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedWork?.title}</DialogTitle>
            <DialogDescription>{selectedWork?.description}</DialogDescription>
          </DialogHeader>
          {selectedWork && (
            <div className="relative aspect-video overflow-hidden rounded-lg">
              <img
                src={selectedWork.image_url}
                alt={selectedWork.title}
                className="w-full h-full object-cover no-select"
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAdminPanel} onOpenChange={setShowAdminPanel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Вход в Админ-панель</DialogTitle>
            <DialogDescription>Введите пароль администратора</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Пароль администратора</Label>
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Введите пароль"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAdminLogin();
                  }
                }}
              />
            </div>
            <Button className="w-full" onClick={handleAdminLogin}>
              Войти
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddWorkDialog} onOpenChange={setShowAddWorkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить работу</DialogTitle>
            <DialogDescription>Загрузите новую работу в портфолио</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={newWorkTitle}
                onChange={(e) => setNewWorkTitle(e.target.value)}
                placeholder="Название работы"
              />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={newWorkDescription}
                onChange={(e) => setNewWorkDescription(e.target.value)}
                placeholder="Описание работы"
              />
            </div>
            <div className="space-y-2">
              <Label>Изображение</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
              {newWorkImage && (
                <p className="text-sm text-muted-foreground">
                  Выбрано: {newWorkImage.name}
                </p>
              )}
            </div>
            <Button className="w-full" onClick={handleAddWork}>
              <Icon name="Plus" size={16} className="mr-2" />
              Добавить работу
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
