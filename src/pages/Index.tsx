import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const API_AUTH = 'https://functions.poehali.dev/e08f0792-ba0a-42cd-9ca9-cdbf5fbdab33';
const API_PORTFOLIO = 'https://functions.poehali.dev/d06f1a39-890c-4b5b-a7d3-dbfd19701228';
const ADMIN_PASSWORD = 'Nastya29472';

interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
}

interface Work {
  id: number;
  user_id: number;
  title: string;
  description: string;
  image_url: string;
  is_favorite?: boolean;
  created_at: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [favorites, setFavorites] = useState<Work[]>([]);
  const [view, setView] = useState<'gallery' | 'favorites' | 'settings'>('gallery');
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedUser = localStorage.getItem('portfolio_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadWorks();
    }
  }, [user]);

  const loadWorks = async () => {
    try {
      const response = await fetch(`${API_PORTFOLIO}?user_id=${user?.id || ''}`);
      const data = await response.json();
      setWorks(data.works || []);
      
      const favResponse = await fetch(`${API_PORTFOLIO}?action=favorites&user_id=${user?.id}`);
      const favData = await favResponse.json();
      setFavorites(favData.works || []);
    } catch (error) {
      console.error('Error loading works:', error);
    }
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const display_name = formData.get('display_name') as string;

    try {
      const response = await fetch(API_AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authMode,
          username,
          password,
          display_name: authMode === 'register' ? display_name : undefined
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('portfolio_user', JSON.stringify(data.user));
        setShowAuth(false);
        toast({ title: authMode === 'login' ? 'Вход выполнен' : 'Регистрация завершена' });
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsAdmin(false);
    localStorage.removeItem('portfolio_user');
    setView('gallery');
  };

  const handleAdminAccess = () => {
    const password = prompt('Введите пароль администратора:');
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      toast({ title: 'Админ-панель активирована' });
    } else {
      toast({ title: 'Неверный пароль', variant: 'destructive' });
    }
  };

  const handleToggleFavorite = async (workId: number) => {
    if (!user) return;

    try {
      const response = await fetch(API_PORTFOLIO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_favorite',
          user_id: user.id,
          work_id: workId
        })
      });

      const data = await response.json();
      if (data.success) {
        loadWorks();
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleAddWork = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const fileInput = formData.get('image') as File;
    
    if (!fileInput || !fileInput.size) {
      toast({ title: 'Выберите изображение', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageUrl = event.target?.result as string;

      try {
        const response = await fetch(API_PORTFOLIO, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_work',
            user_id: user.id,
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            image_url: imageUrl
          })
        });

        const data = await response.json();
        if (data.success) {
          loadWorks();
          toast({ title: 'Работа добавлена' });
          e.currentTarget.reset();
        }
      } catch (error) {
        toast({ title: 'Ошибка при добавлении', variant: 'destructive' });
      }
    };
    
    reader.readAsDataURL(fileInput);
  };

  const handleDeleteWork = async (workId: number) => {
    if (!confirm('Удалить эту работу?')) return;

    try {
      const response = await fetch(`${API_PORTFOLIO}?work_id=${workId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        loadWorks();
        toast({ title: 'Работа удалена' });
      }
    } catch (error) {
      toast({ title: 'Ошибка при удалении', variant: 'destructive' });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const fileInput = formData.get('avatar') as File;
    
    const updateData: any = {
      user_id: user.id,
      display_name: formData.get('display_name') as string
    };

    const newPassword = formData.get('new_password') as string;
    if (newPassword) {
      updateData.new_password = newPassword;
    }

    if (fileInput && fileInput.size) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        updateData.avatar_url = event.target?.result as string;
        await updateUser(updateData);
      };
      reader.readAsDataURL(fileInput);
    } else {
      await updateUser(updateData);
    }
  };

  const updateUser = async (updateData: any) => {
    try {
      const response = await fetch(API_AUTH, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('portfolio_user', JSON.stringify(data.user));
        toast({ title: 'Профиль обновлён' });
      }
    } catch (error) {
      toast({ title: 'Ошибка обновления', variant: 'destructive' });
    }
  };

  const WorkCard = ({ work, showDelete = false }: { work: Work; showDelete?: boolean }) => (
    <Card className="group relative overflow-hidden hover-scale transition-all duration-300">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={work.image_url}
          alt={work.title}
          className="w-full h-full object-cover no-select"
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h3 className="font-semibold text-lg mb-1">{work.title}</h3>
            <p className="text-sm opacity-90 line-clamp-2">{work.description}</p>
          </div>
        </div>
        {user && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={() => handleToggleFavorite(work.id)}
          >
            <Icon 
              name={work.is_favorite ? "Heart" : "Heart"} 
              size={20} 
              className={work.is_favorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}
            />
          </Button>
        )}
        {showDelete && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => handleDeleteWork(work.id)}
          >
            <Icon name="Trash2" size={20} />
          </Button>
        )}
      </div>
      <div className="cursor-pointer" onClick={() => setSelectedWork(work)}>
        <CardContent className="p-4">
          <h3 className="font-semibold truncate">{work.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-1">{work.description}</p>
        </CardContent>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon name="Briefcase" size={24} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Pro Portfolio</h1>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-2 text-sm">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.display_name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span>{user.display_name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setView('gallery')}>
                  <Icon name="Grid3x3" size={18} className="mr-2" />
                  Галерея
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setView('favorites')}>
                  <Icon name="Heart" size={18} className="mr-2" />
                  Избранное
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setView('settings')}>
                  <Icon name="Settings" size={18} className="mr-2" />
                  Настройки
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <Icon name="LogOut" size={18} className="mr-2" />
                  Выход
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowAuth(true)}>
                <Icon name="User" size={18} className="mr-2" />
                Войти
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!user ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Icon name="Lock" size={40} className="text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Добро пожаловать в Pro Portfolio</h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              Войдите или зарегистрируйтесь, чтобы просматривать работы, добавлять избранное и управлять своим портфолио
            </p>
            <Button size="lg" onClick={() => setShowAuth(true)}>
              <Icon name="User" size={20} className="mr-2" />
              Войти в систему
            </Button>
          </div>
        ) : view === 'gallery' ? (
          <>
            {works.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <Icon name="ImageOff" size={64} className="text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Портфолио пусто</h3>
                <p className="text-muted-foreground">Загрузите первую работу в настройках</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {works.map(work => (
                  <WorkCard key={work.id} work={work} showDelete={isAdmin} />
                ))}
              </div>
            )}
          </>
        ) : view === 'favorites' ? (
          <>
            {favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <Icon name="Heart" size={64} className="text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Избранное пусто</h3>
                <p className="text-muted-foreground">Отметьте работы сердечком, чтобы сохранить их здесь</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {favorites.map(work => (
                  <WorkCard key={work.id} work={work} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="profile">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="profile">Профиль</TabsTrigger>
                    <TabsTrigger value="works">Мои работы</TabsTrigger>
                    {!isAdmin && <TabsTrigger value="admin">Админ</TabsTrigger>}
                    {isAdmin && <TabsTrigger value="admin">Админ-панель</TabsTrigger>}
                  </TabsList>

                  <TabsContent value="profile" className="space-y-4">
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div className="flex justify-center mb-4">
                        <Avatar className="w-24 h-24">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="text-2xl">
                            {user.display_name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div>
                        <Label htmlFor="avatar">Сменить аватар</Label>
                        <Input id="avatar" name="avatar" type="file" accept="image/*" />
                      </div>

                      <div>
                        <Label htmlFor="display_name">Отображаемое имя</Label>
                        <Input 
                          id="display_name" 
                          name="display_name" 
                          defaultValue={user.display_name} 
                          required 
                        />
                      </div>

                      <div>
                        <Label htmlFor="new_password">Новый пароль (оставьте пустым, если не меняете)</Label>
                        <Input id="new_password" name="new_password" type="password" />
                      </div>

                      <Button type="submit" className="w-full">
                        <Icon name="Save" size={18} className="mr-2" />
                        Сохранить изменения
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="works" className="space-y-4">
                    <form onSubmit={handleAddWork} className="space-y-4">
                      <div>
                        <Label htmlFor="title">Название работы</Label>
                        <Input id="title" name="title" required />
                      </div>

                      <div>
                        <Label htmlFor="description">Описание</Label>
                        <Textarea id="description" name="description" rows={3} />
                      </div>

                      <div>
                        <Label htmlFor="image">Изображение</Label>
                        <Input id="image" name="image" type="file" accept="image/*" required />
                      </div>

                      <Button type="submit" className="w-full">
                        <Icon name="Plus" size={18} className="mr-2" />
                        Добавить работу
                      </Button>
                    </form>

                    {works.filter(w => w.user_id === user.id).length > 0 && (
                      <div className="mt-8">
                        <h4 className="font-semibold mb-4">Мои работы:</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {works.filter(w => w.user_id === user.id).map(work => (
                            <div key={work.id} className="relative group">
                              <img 
                                src={work.image_url} 
                                alt={work.title} 
                                className="w-full aspect-square object-cover rounded-lg no-select"
                                onContextMenu={(e) => e.preventDefault()}
                              />
                              <Button
                                size="icon"
                                variant="destructive"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                                onClick={() => handleDeleteWork(work.id)}
                              >
                                <Icon name="Trash2" size={16} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="admin" className="space-y-4">
                    {!isAdmin ? (
                      <div className="text-center py-8">
                        <Icon name="ShieldAlert" size={48} className="mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Доступ к админ-панели</h3>
                        <p className="text-muted-foreground mb-4">
                          Требуется дополнительная аутентификация
                        </p>
                        <Button onClick={handleAdminAccess}>
                          <Icon name="Key" size={18} className="mr-2" />
                          Войти как администратор
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon name="ShieldCheck" size={20} className="text-primary" />
                            <h3 className="font-semibold">Режим администратора активен</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Вы можете управлять всем контентом портфолио
                          </p>
                        </div>

                        <form onSubmit={handleAddWork} className="space-y-4">
                          <div>
                            <Label htmlFor="admin_title">Название работы</Label>
                            <Input id="admin_title" name="title" required />
                          </div>

                          <div>
                            <Label htmlFor="admin_description">Описание</Label>
                            <Textarea id="admin_description" name="description" rows={3} />
                          </div>

                          <div>
                            <Label htmlFor="admin_image">Изображение из галереи устройства</Label>
                            <Input id="admin_image" name="image" type="file" accept="image/*" required />
                          </div>

                          <Button type="submit" className="w-full">
                            <Icon name="Upload" size={18} className="mr-2" />
                            Загрузить в портфолио
                          </Button>
                        </form>

                        <div className="pt-4 border-t">
                          <h4 className="font-semibold mb-4">Управление работами:</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Удаляйте работы через иконку корзины в галерее
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <Dialog open={showAuth} onOpenChange={setShowAuth}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {authMode === 'login' ? 'Вход в систему' : 'Регистрация'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Label htmlFor="auth_username">Логин</Label>
              <Input id="auth_username" name="username" required />
            </div>

            <div>
              <Label htmlFor="auth_password">Пароль</Label>
              <Input id="auth_password" name="password" type="password" required />
            </div>

            {authMode === 'register' && (
              <div>
                <Label htmlFor="auth_display_name">Отображаемое имя</Label>
                <Input id="auth_display_name" name="display_name" />
              </div>
            )}

            <Button type="submit" className="w-full">
              {authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            >
              {authMode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedWork} onOpenChange={() => setSelectedWork(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedWork?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <img
              src={selectedWork?.image_url}
              alt={selectedWork?.title}
              className="w-full rounded-lg no-select"
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
            />
            <p className="text-muted-foreground">{selectedWork?.description}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
